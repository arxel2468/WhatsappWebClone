// SampleLoader.js
import React, { useState } from 'react';
import axios from 'axios';
import { FaDatabase } from 'react-icons/fa';

function SampleLoader({ onLoad, apiUrl }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleLoadSamples = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${apiUrl}/process-samples`);
      console.log('Processed samples:', response.data);
      if (onLoad) {
        onLoad();
      }
    } catch (error) {
      console.error('Error loading samples:', error);
      setError('Failed to load sample data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="sample-loader" onClick={!loading ? handleLoadSamples : undefined}>
      <FaDatabase size={16} />
      {loading ? 'Loading...' : 'Load Sample Data'}
      {error && <div className="sample-loader-error">{error}</div>}
    </div>
  );
}

export default SampleLoader;