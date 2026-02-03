import api from './api';

export const expertAnalysisService = {
  // Fetch expert analysis by project ID
  async getExpertAnalysis(projectId) {
    try {
      const response = await api.get(`/expert-analysis?projectId=${projectId}`);
      console.log('API Response structure:', response.data);
      
      // Handle both response formats
      if (response.data.success && response.data.data) {
        return response.data.data;  // Your API returns {success: true, data: {...}}
      } else {
        return response.data;  // Flat structure
      }
    } catch (error) {
      console.error('Error fetching expert analysis:', error);
      return null;
    }
  },

  // Save expert analysis
  async saveExpertAnalysis(analysisData) {
    try {
      const response = await api.post('/expert-analysis', analysisData);
      console.log('Save response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving expert analysis:', error);
      throw error;
    }
  },

  // Fetch transmission data
  async getTransmissionInterconnection(projectName) {
    try {
      const response = await api.get(`/transmission-interconnection?project=${encodeURIComponent(projectName)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transmission data:', error);
      return [];
    }
  },

  // Save transmission data
  async saveTransmissionInterconnection(projectId, transmissionData) {
    try {
      const response = await api.post('/transmission-interconnection', {
        projectId,
        transmissionData
      });
      return response.data;
    } catch (error) {
      console.error('Error saving transmission data:', error);
      throw error;
    }
  }
};