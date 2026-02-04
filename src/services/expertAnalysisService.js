// src/services/expertAnalysisService.js
import api from './api';

export const expertAnalysisService = {
  // Fetch expert analysis by project ID
  async getExpertAnalysis(projectId) {
    try {
      console.log('🔍 Fetching expert analysis for project:', projectId);
      const response = await api.get(`/api/expert-analysis`, {
        params: { projectId }
      });
      console.log('✅ API Response:', response.data);
      
      // Handle API response format - your backend returns {success: true, data: {...}}
      if (response.data && response.data.success) {
        const data = response.data.data;
        console.log('📊 Expert analysis data found:', data ? 'Yes' : 'No');
        
        if (data) {
          // Ensure all scores are properly formatted
          const formattedData = {
            ...data,
            overallScore: parseFloat(data.overallScore) || 0,
            thermalScore: parseFloat(data.thermalScore) || 0,
            redevelopmentScore: parseFloat(data.redevelopmentScore) || 0,
            infrastructureScore: parseFloat(data.infrastructureScore) || 0,
            confidence: parseInt(data.confidence) || 0,
            // Ensure breakdown objects exist with proper structure
            thermalBreakdown: data.thermalBreakdown || {
              thermal_optimization: { score: 1 },
              environmental: { score: 2 }
            },
            redevelopmentBreakdown: data.redevelopmentBreakdown || {
              redev_market: { score: 2 },
              land_availability: { score: 2 },
              utilities: { score: 2 },
              interconnection: { score: 2 }
            }
          };
          console.log('📊 Formatted expert analysis:', formattedData);
          return formattedData;
        }
        return null;
      } else {
        console.log('⚠️ API response format unexpected:', response.data);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching expert analysis:', error);
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.log('📭 No expert analysis found');
        return null;
      }
      throw error;
    }
  },

  // Save expert analysis
  async saveExpertAnalysis(analysisData) {
    try {
      console.log('💾 Saving expert analysis:', analysisData);
      
      // Format data for backend - match what your controller expects
      const formattedData = {
        projectId: analysisData.projectId,
        projectName: analysisData.projectName,
        overallScore: parseFloat(analysisData.overallScore) || 0,
        overallRating: analysisData.overallRating || this.calculateRating(analysisData.overallScore),
        confidence: parseInt(analysisData.confidence) || 0,
        thermalScore: parseFloat(analysisData.thermalScore) || 0,
        thermalBreakdown: analysisData.thermalBreakdown || {
          thermal_optimization: { score: 1 },
          environmental: { score: 2 }
        },
        redevelopmentScore: parseFloat(analysisData.redevelopmentScore) || 0,
        redevelopmentBreakdown: analysisData.redevelopmentBreakdown || {
          redev_market: { score: 2 },
          land_availability: { score: 2 },
          utilities: { score: 2 },
          interconnection: { score: 2 }
        },
        infrastructureScore: parseFloat(analysisData.infrastructureScore) || 0,
        editedBy: analysisData.editedBy || 'Frontend User'
      };
      
      console.log('📦 Formatted data for backend:', formattedData);
      
      const response = await api.post('/api/expert-analysis', formattedData);
      console.log('✅ Save response:', response.data);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to save expert analysis');
      }
    } catch (error) {
      console.error('❌ Error saving expert analysis:', error);
      throw error;
    }
  },

  // Fetch transmission data
  async getTransmissionInterconnection(projectName) {
    try {
      console.log('🔍 Fetching transmission data for:', projectName);
      const response = await api.get(`/api/transmission-interconnection`, {
        params: { project: projectName }
      });
      console.log('✅ Transmission API response:', response.data);
      
      // Your backend returns {success: true, data: [...]}
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const data = response.data.data;
        console.log(`📊 Found ${data.length} transmission records`);
        
        // Format data for frontend
        return data.map(item => ({
          id: item.id,
          site: item.site,
          poiVoltage: item.poiVoltage,
          excessInjectionCapacity: parseFloat(item.excessInjectionCapacity) || 0,
          excessWithdrawalCapacity: parseFloat(item.excessWithdrawalCapacity) || 0,
          constraints: item.constraints || '-',
          excessIXCapacity: item.excessIXCapacity !== undefined ? item.excessIXCapacity : true,
          projectId: item.projectId,
          notes: item.notes,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }));
      } else {
        console.log('📭 No transmission data found');
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching transmission data:', error);
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.log('📭 No transmission data found (API error)');
        return [];
      }
      return [];
    }
  },

  // Save transmission data
  async saveTransmissionInterconnection(projectId, transmissionData) {
    try {
      console.log('💾 Saving transmission data for project:', projectId);
      console.log('📦 Transmission data:', transmissionData);
      
      // Format data for backend
      const formattedData = {
        projectId: projectId,
        transmissionData: Array.isArray(transmissionData) ? transmissionData.map(item => ({
          site: item.site,
          poiVoltage: item.poiVoltage || '',
          excessInjectionCapacity: parseFloat(item.excessInjectionCapacity) || 0,
          excessWithdrawalCapacity: parseFloat(item.excessWithdrawalCapacity) || 0,
          constraints: item.constraints || '-',
          excessIXCapacity: item.excessIXCapacity !== undefined ? item.excessIXCapacity : true
        })) : []
      };
      
      const response = await api.post('/api/transmission-interconnection', formattedData);
      console.log('✅ Transmission save response:', response.data);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to save transmission data');
      }
    } catch (error) {
      console.error('❌ Error saving transmission data:', error);
      throw error;
    }
  },

  // Helper function to calculate rating based on score
  calculateRating(score) {
    const percent = (score / 6) * 100;
    if (percent >= 85) return 'STRONG';
    if (percent >= 70) return 'GOOD';
    if (percent >= 50) return 'FAIR';
    return 'POOR';
  },

  // Check if expert analysis exists
  async checkExpertAnalysisExists(projectId) {
    try {
      const analysis = await this.getExpertAnalysis(projectId);
      return analysis !== null;
    } catch (error) {
      console.error('❌ Error checking expert analysis:', error);
      return false;
    }
  },

  // Get all project names for dropdown
  async getProjectNames() {
    try {
      // This would need a new endpoint or you can fetch from projects table
      // For now, returning a sample list based on your database
      return [
        { id: '1', name: 'Roseton' },
        { id: '2', name: 'Montpelier' },
        { id: '3', name: 'Hillburn' },
        { id: '4', name: 'Shoemaker' },
        { id: '5', name: 'Martins Creek' },
        { id: '6', name: 'York' },
        { id: '7', name: 'Edge Moor' },
        { id: '8', name: 'Hay Road' },
        { id: '9', name: 'Bethlehem' },
        { id: '10', name: 'Massena' }
      ];
    } catch (error) {
      console.error('❌ Error fetching project names:', error);
      return [];
    }
  }
};
