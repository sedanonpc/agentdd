import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const RootRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're not loading and user is authenticated
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    } else if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading spinner while auth state is being determined
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size={8} color="text-console-blue-bright" />
      </div>
    );
  }

  // Return null while redirecting
  return null;
};

export default RootRouter; 