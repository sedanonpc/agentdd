import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Redirect to homepage on component mount
  useEffect(() => {
    navigate('/');
  }, [navigate]);

  // Return null as this component will redirect immediately
  return null;
};

export default DashboardPage;