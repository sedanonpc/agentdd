import React from 'react';
import TestMatchesDB from '../components/TestMatchesDB';

const TestPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display text-console-white mb-6">Database Testing</h1>
      <TestMatchesDB />
    </div>
  );
};

export default TestPage; 