# 📱 **macOS App Storage Architecture Plan**

## 🎯 **Overview**
Implement a comprehensive local storage solution for the macOS Figma-Web Comparison Tool that stores reports, settings, and cache data in the application's dedicated directory structure.

## 🏗️ **Storage Architecture**

### **Directory Structure**
```
~/Library/Application Support/Figma Comparison Tool/
├── Reports/                          # Comparison reports
│   ├── 2025/                        # Year-based organization
│   │   ├── 01/                      # Month folders
│   │   │   ├── report_20250115_143022.json
│   │   │   ├── report_20250115_143022_assets/
│   │   │   │   ├── screenshots/
│   │   │   │   ├── figma_exports/
│   │   │   │   └── comparison_images/
│   │   │   └── report_20250116_091245.json
│   │   └── 02/
│   └── index.json                   # Report metadata index
├── Cache/                           # Temporary data
│   ├── figma_files/                 # Cached Figma data
│   ├── web_snapshots/               # Web page snapshots
│   └── thumbnails/                  # Report thumbnails
├── Settings/                        # App configuration
│   ├── user_preferences.json
│   ├── figma_tokens.keychain       # Encrypted tokens
│   └── comparison_templates.json
├── Exports/                         # User exports
│   ├── pdf_reports/
│   ├── csv_data/
│   └── image_collections/
└── Logs/                           # Application logs
    ├── app.log
    ├── comparison.log
    └── error.log
```

## 🔧 **Implementation Components**

### **1. Storage Manager (Swift)**

```swift
// StorageManager.swift
import Foundation
import SQLite3

class StorageManager {
    static let shared = StorageManager()
    
    private let appSupportURL: URL
    private let reportsURL: URL
    private let cacheURL: URL
    private let settingsURL: URL
    private let exportsURL: URL
    
    private var database: OpaquePointer?
    
    private init() {
        // Get Application Support directory
        let fileManager = FileManager.default
        appSupportURL = fileManager.urls(for: .applicationSupportDirectory, 
                                       in: .userDomainMask).first!
                                       .appendingPathComponent("Figma Comparison Tool")
        
        reportsURL = appSupportURL.appendingPathComponent("Reports")
        cacheURL = appSupportURL.appendingPathComponent("Cache")
        settingsURL = appSupportURL.appendingPathComponent("Settings")
        exportsURL = appSupportURL.appendingPathComponent("Exports")
        
        setupDirectories()
        setupDatabase()
    }
    
    private func setupDirectories() {
        let directories = [appSupportURL, reportsURL, cacheURL, settingsURL, exportsURL]
        
        for directory in directories {
            try? FileManager.default.createDirectory(at: directory, 
                                                   withIntermediateDirectories: true)
        }
        
        // Create subdirectories
        let subdirs = [
            reportsURL.appendingPathComponent("index.json"),
            cacheURL.appendingPathComponent("figma_files"),
            cacheURL.appendingPathComponent("web_snapshots"),
            cacheURL.appendingPathComponent("thumbnails")
        ]
        
        for subdir in subdirs {
            try? FileManager.default.createDirectory(at: subdir, 
                                                   withIntermediateDirectories: true)
        }
    }
    
    private func setupDatabase() {
        let dbPath = appSupportURL.appendingPathComponent("reports.db").path
        
        if sqlite3_open(dbPath, &database) == SQLITE_OK {
            createTables()
        } else {
            print("Unable to open database")
        }
    }
    
    private func createTables() {
        let createReportsTable = """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                figma_url TEXT NOT NULL,
                web_url TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                completed_at INTEGER,
                duration INTEGER,
                score INTEGER,
                issues_count INTEGER,
                file_path TEXT NOT NULL,
                thumbnail_path TEXT,
                size_bytes INTEGER
            );
        """
        
        let createTagsTable = """
            CREATE TABLE IF NOT EXISTS report_tags (
                report_id TEXT,
                tag TEXT,
                FOREIGN KEY(report_id) REFERENCES reports(id)
            );
        """
        
        sqlite3_exec(database, createReportsTable, nil, nil, nil)
        sqlite3_exec(database, createTagsTable, nil, nil, nil)
    }
}

// MARK: - Report Management
extension StorageManager {
    func saveReport(_ report: ComparisonReport) -> Bool {
        let reportData = try? JSONEncoder().encode(report)
        let fileName = "report_\(report.id).json"
        let yearMonth = getYearMonthPath(from: report.createdAt)
        let reportDir = reportsURL.appendingPathComponent(yearMonth)
        
        // Create year/month directory
        try? FileManager.default.createDirectory(at: reportDir, 
                                               withIntermediateDirectories: true)
        
        let filePath = reportDir.appendingPathComponent(fileName)
        
        // Save JSON file
        guard let data = reportData,
              (try? data.write(to: filePath)) != nil else {
            return false
        }
        
        // Save to database
        return insertReportToDatabase(report, filePath: filePath.path)
    }
    
    func loadReport(id: String) -> ComparisonReport? {
        guard let filePath = getReportFilePath(id: id),
              let data = try? Data(contentsOf: URL(fileURLWithPath: filePath)),
              let report = try? JSONDecoder().decode(ComparisonReport.self, from: data) else {
            return nil
        }
        return report
    }
    
    func deleteReport(id: String) -> Bool {
        guard let filePath = getReportFilePath(id: id) else { return false }
        
        // Delete file
        try? FileManager.default.removeItem(atPath: filePath)
        
        // Delete from database
        let deleteSQL = "DELETE FROM reports WHERE id = ?;"
        var statement: OpaquePointer?
        
        if sqlite3_prepare_v2(database, deleteSQL, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, id, -1, nil)
            sqlite3_step(statement)
        }
        sqlite3_finalize(statement)
        
        return true
    }
    
    func getAllReports() -> [ComparisonReportMetadata] {
        var reports: [ComparisonReportMetadata] = []
        let querySQL = "SELECT * FROM reports ORDER BY created_at DESC;"
        var statement: OpaquePointer?
        
        if sqlite3_prepare_v2(database, querySQL, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let report = ComparisonReportMetadata(
                    id: String(cString: sqlite3_column_text(statement, 0)),
                    title: String(cString: sqlite3_column_text(statement, 1)),
                    figmaUrl: String(cString: sqlite3_column_text(statement, 2)),
                    webUrl: String(cString: sqlite3_column_text(statement, 3)),
                    status: String(cString: sqlite3_column_text(statement, 4)),
                    createdAt: Date(timeIntervalSince1970: sqlite3_column_double(statement, 5)),
                    completedAt: sqlite3_column_type(statement, 6) != SQLITE_NULL ? 
                        Date(timeIntervalSince1970: sqlite3_column_double(statement, 6)) : nil,
                    duration: sqlite3_column_int(statement, 7),
                    score: sqlite3_column_int(statement, 8),
                    issuesCount: sqlite3_column_int(statement, 9),
                    filePath: String(cString: sqlite3_column_text(statement, 10)),
                    thumbnailPath: sqlite3_column_type(statement, 11) != SQLITE_NULL ?
                        String(cString: sqlite3_column_text(statement, 11)) : nil,
                    sizeBytes: sqlite3_column_int64(statement, 12)
                )
                reports.append(report)
            }
        }
        sqlite3_finalize(statement)
        
        return reports
    }
}

// MARK: - Cache Management
extension StorageManager {
    func cacheData<T: Codable>(_ data: T, key: String, category: CacheCategory) -> Bool {
        let encoder = JSONEncoder()
        guard let jsonData = try? encoder.encode(data) else { return false }
        
        let categoryURL = cacheURL.appendingPathComponent(category.rawValue)
        try? FileManager.default.createDirectory(at: categoryURL, withIntermediateDirectories: true)
        
        let fileURL = categoryURL.appendingPathComponent("\(key).json")
        return (try? jsonData.write(to: fileURL)) != nil
    }
    
    func getCachedData<T: Codable>(_ type: T.Type, key: String, category: CacheCategory) -> T? {
        let fileURL = cacheURL.appendingPathComponent(category.rawValue).appendingPathComponent("\(key).json")
        
        guard let data = try? Data(contentsOf: fileURL),
              let object = try? JSONDecoder().decode(type, from: data) else {
            return nil
        }
        return object
    }
    
    func clearCache(category: CacheCategory? = nil) {
        if let category = category {
            let categoryURL = cacheURL.appendingPathComponent(category.rawValue)
            try? FileManager.default.removeItem(at: categoryURL)
        } else {
            try? FileManager.default.removeItem(at: cacheURL)
            try? FileManager.default.createDirectory(at: cacheURL, withIntermediateDirectories: true)
        }
    }
}

// MARK: - Settings Management
extension StorageManager {
    func saveSettings<T: Codable>(_ settings: T, key: String) -> Bool {
        let encoder = JSONEncoder()
        guard let data = try? encoder.encode(settings) else { return false }
        
        let fileURL = settingsURL.appendingPathComponent("\(key).json")
        return (try? data.write(to: fileURL)) != nil
    }
    
    func loadSettings<T: Codable>(_ type: T.Type, key: String) -> T? {
        let fileURL = settingsURL.appendingPathComponent("\(key).json")
        
        guard let data = try? Data(contentsOf: fileURL),
              let settings = try? JSONDecoder().decode(type, from: data) else {
            return nil
        }
        return settings
    }
}

enum CacheCategory: String {
    case figmaFiles = "figma_files"
    case webSnapshots = "web_snapshots"
    case thumbnails = "thumbnails"
}
```

### **2. Data Models**

```swift
// ComparisonReport.swift
import Foundation

struct ComparisonReport: Codable {
    let id: String
    let title: String
    let figmaUrl: String
    let webUrl: String
    let status: ComparisonStatus
    let createdAt: Date
    let completedAt: Date?
    let duration: TimeInterval?
    let score: Int?
    let issuesCount: Int
    let figmaData: FigmaData
    let webData: WebData
    let comparisonResults: ComparisonResults
    let assets: [AssetReference]
    let metadata: ReportMetadata
}

struct ComparisonReportMetadata: Codable {
    let id: String
    let title: String
    let figmaUrl: String
    let webUrl: String
    let status: String
    let createdAt: Date
    let completedAt: Date?
    let duration: Int32
    let score: Int32
    let issuesCount: Int32
    let filePath: String
    let thumbnailPath: String?
    let sizeBytes: Int64
}

struct AssetReference: Codable {
    let id: String
    let type: AssetType
    let originalPath: String
    let storedPath: String
    let size: Int64
    let checksum: String
}

enum AssetType: String, Codable {
    case screenshot
    case figmaExport
    case comparisonImage
    case thumbnail
}

enum ComparisonStatus: String, Codable {
    case pending
    case inProgress = "in-progress"
    case completed
    case failed
    case cancelled
}
```

### **3. Export Manager**

```swift
// ExportManager.swift
import Foundation
import PDFKit

class ExportManager {
    private let storageManager = StorageManager.shared
    
    func exportReportToPDF(reportId: String) -> URL? {
        guard let report = storageManager.loadReport(id: reportId) else { return nil }
        
        let pdfDocument = PDFDocument()
        
        // Create PDF pages from report data
        let pages = createPDFPages(from: report)
        for (index, page) in pages.enumerated() {
            pdfDocument.insert(page, at: index)
        }
        
        // Save to exports directory
        let fileName = "report_\(reportId)_\(Date().timeIntervalSince1970).pdf"
        let exportURL = storageManager.exportsURL.appendingPathComponent("pdf_reports").appendingPathComponent(fileName)
        
        return pdfDocument.write(to: exportURL) ? exportURL : nil
    }
    
    func exportReportToCSV(reportId: String) -> URL? {
        guard let report = storageManager.loadReport(id: reportId) else { return nil }
        
        let csvContent = generateCSVContent(from: report)
        let fileName = "report_\(reportId)_\(Date().timeIntervalSince1970).csv"
        let exportURL = storageManager.exportsURL.appendingPathComponent("csv_data").appendingPathComponent(fileName)
        
        return (try? csvContent.write(to: exportURL, atomically: true, encoding: .utf8)) != nil ? exportURL : nil
    }
    
    func exportAssetsArchive(reportId: String) -> URL? {
        guard let report = storageManager.loadReport(id: reportId) else { return nil }
        
        // Create ZIP archive of all assets
        let archiveName = "assets_\(reportId)_\(Date().timeIntervalSince1970).zip"
        let archiveURL = storageManager.exportsURL.appendingPathComponent("image_collections").appendingPathComponent(archiveName)
        
        // Implementation for creating ZIP archive
        return createAssetsArchive(report: report, destinationURL: archiveURL)
    }
}
```

### **4. Storage Maintenance**

```swift
// StorageMaintenance.swift
import Foundation

class StorageMaintenance {
    private let storageManager = StorageManager.shared
    
    func performMaintenance() {
        cleanupOldCache()
        optimizeDatabase()
        generateThumbnails()
        validateDataIntegrity()
    }
    
    private func cleanupOldCache() {
        let cacheURL = storageManager.cacheURL
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
        
        // Remove cache files older than 7 days
        if let enumerator = FileManager.default.enumerator(at: cacheURL, includingPropertiesForKeys: [.creationDateKey]) {
            for case let fileURL as URL in enumerator {
                if let creationDate = try? fileURL.resourceValues(forKeys: [.creationDateKey]).creationDate,
                   creationDate < cutoffDate {
                    try? FileManager.default.removeItem(at: fileURL)
                }
            }
        }
    }
    
    private func optimizeDatabase() {
        sqlite3_exec(storageManager.database, "VACUUM;", nil, nil, nil)
        sqlite3_exec(storageManager.database, "ANALYZE;", nil, nil, nil)
    }
    
    func getStorageUsage() -> StorageUsage {
        let reportsSize = getDirectorySize(storageManager.reportsURL)
        let cacheSize = getDirectorySize(storageManager.cacheURL)
        let exportsSize = getDirectorySize(storageManager.exportsURL)
        
        return StorageUsage(
            totalSize: reportsSize + cacheSize + exportsSize,
            reportsSize: reportsSize,
            cacheSize: cacheSize,
            exportsSize: exportsSize
        )
    }
}

struct StorageUsage {
    let totalSize: Int64
    let reportsSize: Int64
    let cacheSize: Int64
    let exportsSize: Int64
    
    var formattedTotalSize: String {
        ByteCountFormatter.string(fromByteCount: totalSize, countStyle: .file)
    }
}
```

## 🔐 **Security & Privacy**

### **Data Encryption**
- Figma API tokens stored in macOS Keychain
- Sensitive report data encrypted at rest
- User preferences encrypted with app-specific key

### **Privacy Compliance**
- No data transmitted to external servers
- All processing happens locally
- User controls data retention policies

## 📊 **Performance Optimization**

### **Database Indexing**
```sql
CREATE INDEX idx_reports_created_at ON reports(created_at);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_report_tags_report_id ON report_tags(report_id);
```

### **Caching Strategy**
- LRU cache for frequently accessed reports
- Lazy loading of report assets
- Background thumbnail generation
- Automatic cache cleanup

## 🔄 **Backup & Sync**

### **Local Backup**
```swift
func createBackup() -> URL? {
    let backupName = "figma_comparison_backup_\(Date().timeIntervalSince1970).zip"
    let backupURL = documentsURL.appendingPathComponent(backupName)
    
    // Create ZIP archive of entire app data
    return createArchive(sourceURL: appSupportURL, destinationURL: backupURL)
}

func restoreFromBackup(backupURL: URL) -> Bool {
    // Extract backup and restore data
    return extractArchive(sourceURL: backupURL, destinationURL: appSupportURL)
}
```

### **iCloud Integration (Optional)**
- Store reports in iCloud Drive folder
- Sync settings across devices
- Conflict resolution for concurrent edits

## 📈 **Usage Analytics**

### **Local Analytics Only**
```swift
struct UsageMetrics: Codable {
    let totalReports: Int
    let averageComparisonTime: TimeInterval
    let mostUsedFeatures: [String]
    let storageUsage: StorageUsage
    let lastMaintenanceDate: Date
}
```

## 🚀 **Implementation Timeline**

### **Phase 1: Core Storage (Week 1-2)**
- Directory structure setup
- Basic CRUD operations
- SQLite database integration

### **Phase 2: Advanced Features (Week 3-4)**
- Export functionality
- Cache management
- Search and filtering

### **Phase 3: Optimization (Week 5-6)**
- Performance tuning
- Storage maintenance
- Backup/restore

### **Phase 4: Polish (Week 7-8)**
- UI integration
- Error handling
- Documentation

This comprehensive storage solution provides a robust, scalable foundation for the macOS app while maintaining user privacy and optimal performance.
