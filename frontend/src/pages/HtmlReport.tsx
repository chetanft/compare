import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getReportFromLocalStorage, saveReportToLocalStorage, generateErrorReportHtml } from '../utils/reportFallback'
import { checkServerHealth, checkReportAvailability } from '../services/serverStatus'
import ServerStatus from '../components/ui/ServerStatus'

export default function HtmlReport() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking')

  // Handle server status change
  const handleServerStatusChange = (status: 'online' | 'offline' | 'checking') => {
    setServerStatus(status);
    
    // If server comes back online and we have a report ID, refetch the report
    if (status === 'online' && reportId && !loading) {
      setLoading(true);
      setError(null);
      setUsingFallback(false);
    }
  };

  useEffect(() => {
    const fetchHtmlReport = async () => {
      if (!reportId) {
        setError('Report ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        setUsingFallback(false)
        
        // Check if server is offline
        if (serverStatus === 'offline') {
          console.log('Server is offline, trying to load from localStorage');
          const cachedReport = getReportFromLocalStorage(reportId);
          
          if (cachedReport) {
            console.log('Found cached report in localStorage');
            setHtmlContent(cachedReport);
            setUsingFallback(true);
            setLoading(false);
            return;
          } else {
            // Generate a friendly error report for offline mode
            const errorMsg = `Server is offline and no cached report found for ID: ${reportId}`;
            setHtmlContent(generateErrorReportHtml(reportId, errorMsg + ". Please restart the server and try again."));
            setError(errorMsg);
            setLoading(false);
            return;
          }
        }
        
        // Clean up reportId - remove any "comparison-" prefix if it exists
        const cleanReportId = reportId.startsWith('comparison-') ? reportId : `comparison-${reportId}`
        
        // First check if the report exists
        const reportExists = await checkReportAvailability(reportId);
        if (!reportExists) {
          console.log('Report not found on server');
          const cachedReport = getReportFromLocalStorage(reportId);
          
          if (cachedReport) {
            console.log('Found cached report in localStorage');
            setHtmlContent(cachedReport);
            setUsingFallback(true);
            setLoading(false);
            return;
          } else {
            // Try to check for the clean report ID
            const cleanReportExists = await checkReportAvailability(cleanReportId);
            if (!cleanReportExists) {
              const errorMsg = `Report with ID ${reportId} not found on server or in cache`;
              setHtmlContent(generateErrorReportHtml(reportId, errorMsg));
              throw new Error(errorMsg);
            }
          }
        }
        
        // Try different paths to find the report - prioritize HTML over JSON
        const paths = [
          `/output/reports/${cleanReportId}.html`,
          `/reports/${cleanReportId}.html`,
          `/output/reports/${reportId}.html`,
          `/reports/${reportId}.html`,
          `/output/reports/${cleanReportId}.json`,
          `/reports/${cleanReportId}.json`,
          `/output/reports/${reportId}.json`,
          `/reports/${reportId}.json`
        ];
        
        let content: string | null = null;
        let isJson = false;
        let foundPath = '';
        
        // Try each path until we find a valid response
        for (const path of paths) {
          console.log(`Trying to fetch report from: ${path}`);
          try {
            const response = await fetch(path, {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });
            
            if (response.ok) {
              if (path.endsWith('.json')) {
                const jsonData = await response.json();
                content = formatJsonAsHtml(jsonData);
                isJson = true;
              } else {
                content = await response.text();
              }
              console.log(`Successfully loaded report from: ${path}`);
              foundPath = path;
              
              // Cache the report for offline access
              if (content) {
                saveReportToLocalStorage(reportId, content);
              }
              
              break;
            }
          } catch (e) {
            console.warn(`Failed to fetch from ${path}:`, e);
            // Continue to next path
          }
        }
        
        // If we couldn't fetch from server, try localStorage
        if (!content) {
          console.log('Trying to load report from localStorage');
          const cachedReport = getReportFromLocalStorage(reportId);
          
          if (cachedReport) {
            console.log('Found cached report in localStorage');
            content = cachedReport;
            setUsingFallback(true);
          }
        }
        
        if (content) {
          setHtmlContent(content);
        } else {
          const errorMsg = `Could not find report with ID: ${reportId}. The server might be down or the report doesn't exist.`;
          // Generate a fallback error report
          setHtmlContent(generateErrorReportHtml(reportId, errorMsg));
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error('Error fetching report:', err)
        setError(err instanceof Error ? err.message : 'Failed to load report. Please ensure the server is running.')
      } finally {
        setLoading(false)
      }
    }

    if (reportId) {
      fetchHtmlReport();
    }
  }, [reportId, serverStatus]);

  // Function to format JSON as HTML
  const formatJsonAsHtml = (jsonData: any) => {
    // Extract relevant data
    const metadata = jsonData.metadata || {};
    const figmaData = jsonData.figmaData || {};
    const webData = jsonData.webData || {};
    
    return `
      <html>
        <head>
          <title>Extraction Report</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #333; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 0.5rem; margin-bottom: 2rem; }
            .section { background: white; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            h1, h2, h3 { margin-top: 0; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
            .card { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; }
            pre { background: #f5f5f5; padding: 1rem; border-radius: 0.25rem; overflow: auto; }
            .tabs { display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
            .tab { padding: 0.5rem 1rem; cursor: pointer; }
            .tab.active { border-bottom: 2px solid #4f46e5; color: #4f46e5; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Extraction Report</h1>
              <p>Generated: ${new Date(metadata.timestamp || metadata.generatedAt || Date.now()).toLocaleString()}</p>
            </div>
            
            <div class="section">
              <div class="tabs">
                <div class="tab active" onclick="showTab('figma')">Figma Data</div>
                <div class="tab" onclick="showTab('web')">Web Data</div>
              </div>
              
              <div id="figma-content" class="tab-content active">
                <h2>Figma Extraction</h2>
                ${figmaData.name ? `<p><strong>File:</strong> ${figmaData.name}</p>` : ''}
                ${figmaData.lastModified ? `<p><strong>Last Modified:</strong> ${new Date(figmaData.lastModified).toLocaleString()}</p>` : ''}
                
                <h3>Components (${figmaData.components?.length || 0})</h3>
                <div class="grid">
                  ${figmaData.components?.slice(0, 20).map((comp: any) => `
                    <div class="card">
                      <h4>${comp.name || 'Unnamed Component'}</h4>
                      <p>Type: ${comp.type || 'Unknown'}</p>
                      ${comp.id ? `<p>ID: ${comp.id}</p>` : ''}
                    </div>
                  `).join('') || 'No components found'}
                </div>
                ${figmaData.components?.length > 20 ? `<p>And ${figmaData.components.length - 20} more components...</p>` : ''}
              </div>
              
              <div id="web-content" class="tab-content">
                <h2>Web Extraction</h2>
                ${webData.url ? `<p><strong>URL:</strong> ${webData.url}</p>` : ''}
                
                <h3>Elements (${webData.elements?.length || 0})</h3>
                <div class="grid">
                  ${webData.elements?.slice(0, 20).map((elem: any) => `
                    <div class="card">
                      <h4>${elem.name || elem.tagName || 'Element'}</h4>
                      <p>Type: ${elem.type || elem.tagName || 'Unknown'}</p>
                      ${elem.selector ? `<p>Selector: ${elem.selector}</p>` : ''}
                    </div>
                  `).join('') || 'No elements found'}
                </div>
                ${webData.elements?.length > 20 ? `<p>And ${webData.elements.length - 20} more elements...</p>` : ''}
              </div>
            </div>
          </div>
          
          <script>
            function showTab(tabName) {
              // Hide all tab contents
              const tabContents = document.querySelectorAll('.tab-content');
              tabContents.forEach(content => {
                content.classList.remove('active');
              });
              
              // Remove active class from all tabs
              const tabs = document.querySelectorAll('.tab');
              tabs.forEach(tab => {
                tab.classList.remove('active');
              });
              
              // Show selected tab content
              document.getElementById(tabName + '-content').classList.add('active');
              
              // Activate the clicked tab
              document.querySelector('.tab[onclick="showTab(\\''+tabName+'\\')"]').classList.add('active');
            }
          </script>
        </body>
      </html>
    `;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center text-indigo-600 hover:text-indigo-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Reports
          </button>
          
          <ServerStatus onStatusChange={handleServerStatusChange} />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-medium text-red-600 mb-4">Error</h2>
            <p className="text-gray-700">{error}</p>
            <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
              <h3 className="font-medium mb-2">Troubleshooting:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Make sure the server is running (npm run start:unified)</li>
                <li>Check that the report ID is correct</li>
                <li>The report file may have been deleted or moved</li>
                <li>Try restarting both the frontend and backend servers</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h1 className="text-xl font-medium text-gray-900">
                Report: {reportId}
              </h1>
              {usingFallback && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ⚠️ Using cached version of the report. The server might be unavailable.
                </div>
              )}
            </div>
            <div className="report-container">
              {htmlContent ? (
                <iframe
                  srcDoc={htmlContent}
                  className="w-full"
                  style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
                  title="HTML Report"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="p-6 text-center text-gray-500">No content available</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 