import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  EyeIcon, 
  TrashIcon, 
  ArrowDownTrayIcon, 
  MagnifyingGlassIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { getApiBaseUrl } from '@/utils/environment';

interface ComparisonReport {
  id: string;
  title: string;
  figmaUrl: string;
  webUrl: string;
  status: 'completed' | 'failed' | 'in-progress';
  createdAt: string;
  duration: number;
  score?: number;
  issues?: number;
  url?: string; // URL to the actual report file
}

export default function Reports() {
  const [reports, setReports] = useState<ComparisonReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/reports/list`);
      const data = await response.json();
      
      if (data.success && data.reports) {
        console.log(`✅ Loaded ${data.reports.length} real reports from backend`);
        setReports(data.reports);
      } else {
        console.warn('⚠️ No reports data in API response:', data);
        setReports([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch reports:', error);
      // Show empty state instead of mock data
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = (report.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (report.figmaUrl?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (report.webUrl?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || report.status === filter;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleViewReport = (report: ComparisonReport) => {
    // Open the report file in a new tab using the URL from the API
    const apiBaseUrl = getApiBaseUrl();
    const reportUrl = report.url || `/reports/report_${report.id}.html`;
    const fullUrl = reportUrl.startsWith('http') ? reportUrl : `${apiBaseUrl}${reportUrl}`;
    window.open(fullUrl, '_blank');
  };

  const handleExportReport = async (report: ComparisonReport) => {
    try {
      // Download the report file using the URL from the API
      const apiBaseUrl = getApiBaseUrl();
      const reportUrl = report.url || `/reports/report_${report.id}.html`;
      const fullUrl = reportUrl.startsWith('http') ? reportUrl : `${apiBaseUrl}${reportUrl}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}_${report.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const handleDeleteReport = async (report: ComparisonReport) => {
    if (!confirm(`Are you sure you want to delete "${report.title}"?`)) {
      return;
    }
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/reports/${report.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setReports(reports.filter(r => r.id !== report.id));
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('Failed to delete report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">View and manage your design comparison history</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {filteredReports.length} reports
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'completed', 'failed'].map((filterOption) => (
                <Button
                  key={filterOption}
                  variant={filter === filterOption ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(filterOption as any)}
                  className="capitalize"
                >
                  {filterOption}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <DocumentTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No reports found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first comparison to see reports here'
                }
              </p>
              {!searchTerm && filter === 'all' && (
                <Button asChild>
                  <a href="/new-comparison">Compare</a>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{report.title}</h3>
                        {getStatusBadge(report.status)}
                        {report.score && (
                          <Badge variant="outline" className={getScoreColor(report.score)}>
                            Score: {report.score}%
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="space-y-1">
                          <p><strong>Figma:</strong> {report.figmaUrl}</p>
                          <p><strong>Web:</strong> {report.webUrl}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {formatDate(report.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            Duration: {formatDuration(report.duration)}
                          </div>
                          {report.issues !== undefined && (
                            <p className="text-orange-600">
                              {report.issues} issue{report.issues !== 1 ? 's' : ''} found
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewReport(report)}
                        title="View report in new tab"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport(report)}
                        title="Download report file"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteReport(report)}
                        title="Delete report"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
