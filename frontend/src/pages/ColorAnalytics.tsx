import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette, Component } from 'lucide-react';

interface ColorElement {
  id: string;
  name: string;
  type: string;
  source: 'figma' | 'web';
  colorType: string;
  properties?: any;
}

interface ColorAnalytics {
  color: string;
  elements: ColorElement[];
  totalUsage: number;
  figmaUsage: number;
  webUsage: number;
}

export default function ColorAnalytics() {
  const [searchParams] = useSearchParams();
  const [analytics, setAnalytics] = useState<ColorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedColor = searchParams.get('color') || '';

  useEffect(() => {
    if (selectedColor) {
      fetchColorAnalytics(selectedColor);
    }
  }, [selectedColor]);

  const fetchColorAnalytics = async (color: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/colors/${encodeURIComponent(color)}/elements`);
      const data = await response.json();
      
      if (data.success) {
        const elements = data.elements || [];
        const figmaElements = elements.filter((el: ColorElement) => el.source === 'figma');
        const webElements = elements.filter((el: ColorElement) => el.source === 'web');
        
        setAnalytics({
          color,
          elements,
          totalUsage: elements.length,
          figmaUsage: figmaElements.length,
          webUsage: webElements.length
        });
      } else {
        setError(data.message || 'Failed to fetch color analytics');
      }
    } catch (err) {
      console.error('Error fetching color analytics:', err);
      setError('Failed to connect to color analytics service');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg">Loading color analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Button onClick={handleGoBack} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <Palette className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Color Analytics Error
              </h3>
              <p className="text-red-700">{error}</p>
              <Button 
                onClick={() => fetchColorAnalytics(selectedColor)} 
                className="mt-4"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <Button onClick={handleGoBack} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Color Selected
              </h3>
              <p className="text-gray-600">Please select a color to view its analytics.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button onClick={handleGoBack} variant="ghost" className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Color Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div 
              className="w-16 h-16 rounded-lg border-2 border-gray-200 shadow-sm"
              style={{ backgroundColor: analytics.color }}
            />
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Color Analytics</span>
              </CardTitle>
              <CardDescription>
                <span className="font-mono text-lg">{analytics.color}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {analytics.totalUsage}
              </div>
              <div className="text-sm text-gray-600">Total Elements</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {analytics.figmaUsage}
              </div>
              <div className="text-sm text-gray-600">Figma Components</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.webUsage}
              </div>
              <div className="text-sm text-gray-600">Web Elements</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Elements List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Component className="w-5 h-5" />
            <span>Elements Using This Color</span>
          </CardTitle>
          <CardDescription>
            Components and elements that use {analytics.color}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.elements.length === 0 ? (
            <div className="text-center py-8">
              <Component className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No elements found using this color.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.elements.map((element, index) => (
                <div key={`${element.source}-${element.id}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={element.source === 'figma' ? 'default' : 'secondary'}>
                      {element.source}
                    </Badge>
                    <div>
                      <div className="font-medium">{element.name}</div>
                      <div className="text-sm text-gray-600">
                        {element.type} • {element.colorType}
                      </div>
                    </div>
                  </div>
                  <div 
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: analytics.color }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
