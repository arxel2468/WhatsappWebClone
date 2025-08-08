// src/components/SampleLoader.js
import React, { useState } from 'react';
import axios from 'axios';
import { FaDatabase } from 'react-icons/fa';

function SampleLoader({ onLoad, apiUrl }) {
  const [loading, setLoading] = useState(false);
  
  const handleLoadSamples = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${apiUrl}/process-samples`);
      console.log('Processed samples:', response.data);
      if (onLoad) {
        onLoad();
      }
    } catch (error) {
      console.error('Error loading samples:', error);
      alert('Error loading samples. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="sample-loader" onClick={handleLoadSamples}>
      <FaDatabase size={16} />
      {loading ? 'Loading...' : 'Load Sample Data'}
    </div>
  );
}

export default SampleLoader;