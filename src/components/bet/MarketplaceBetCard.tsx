import React, { useState } from 'react';
import { Box, Typography, Button, Chip, Collapse, IconButton, CircularProgress, Avatar, Tooltip } from '@mui/material';
import { ChevronDown, ChevronUp, Check, X, Clock, Trophy, AlertTriangle } from 'lucide-react';
import { Bet, BetStatus } from '../../types';
import { truncateAddress } from '../../utils/addressUtils';
import { formatDistanceToNow } from 'date-fns';
import { useWeb3 } from '../../context/Web3Context';
import { useDarePoints } from '../../context/DarePointsContext';
import { toast } from 'react-toastify';

interface MarketplaceBetCardProps {
  bet: Bet;
  onAccept: (bet: Bet) => Promise<void>;
  isProcessing?: boolean;
  showExpanded?: boolean;
}

const StatusChip = ({ status }: { status: BetStatus }) => {
  switch (status) {
    case BetStatus.OPEN:
      return <Chip 
        icon={<Clock size={14} />} 
        label="Open" 
        size="small" 
        sx={{ 
          bgcolor: 'rgba(3, 169, 244, 0.2)', 
          color: '#03A9F4',
          '& .MuiChip-icon': { color: '#03A9F4' },
          height: '24px',
          fontSize: '0.75rem',
          '& .MuiChip-label': { px: 1 }
        }} 
      />;
    case BetStatus.ACTIVE:
      return <Chip 
        icon={<Check size={14} />} 
        label="Active" 
        size="small" 
        sx={{ 
          bgcolor: 'rgba(76, 175, 80, 0.2)', 
          color: '#4CAF50',
          '& .MuiChip-icon': { color: '#4CAF50' },
          height: '24px',
          fontSize: '0.75rem',
          '& .MuiChip-label': { px: 1 }
        }} 
      />;
    case BetStatus.COMPLETED:
      return <Chip 
        icon={<Trophy size={14} />} 
        label="Completed" 
        size="small" 
        sx={{ 
          bgcolor: 'rgba(229, 255, 3, 0.2)', 
          color: '#E5FF03',
          '& .MuiChip-icon': { color: '#E5FF03' },
          height: '24px',
          fontSize: '0.75rem',
          '& .MuiChip-label': { px: 1 }
        }} 
      />;
    case BetStatus.CANCELLED:
      return <Chip 
        icon={<X size={14} />} 
        label="Cancelled" 
        size="small" 
        sx={{ 
          bgcolor: 'rgba(244, 67, 54, 0.2)', 
          color: '#F44336',
          '& .MuiChip-icon': { color: '#F44336' },
          height: '24px',
          fontSize: '0.75rem',
          '& .MuiChip-label': { px: 1 }
        }} 
      />;
    default:
      return <Chip 
        icon={<AlertTriangle size={14} />} 
        label="Unknown" 
        size="small" 
        sx={{ 
          bgcolor: 'rgba(158, 158, 158, 0.2)', 
          color: '#9E9E9E',
          '& .MuiChip-icon': { color: '#9E9E9E' },
          height: '24px',
          fontSize: '0.75rem',
          '& .MuiChip-label': { px: 1 }
        }} 
      />;
  }
};

const MarketplaceBetCard: React.FC<MarketplaceBetCardProps> = ({ 
  bet, 
  onAccept, 
  isProcessing = false,
  showExpanded = false
}) => {
  const [expanded, setExpanded] = useState<boolean>(showExpanded);
  const { account } = useWeb3();
  const { userBalance } = useDarePoints();
  
  const isCreator = account && account.toLowerCase() === bet.creator.toLowerCase();
  const isAcceptor = account && bet.acceptor && account.toLowerCase() === bet.acceptor.toLowerCase();
  const isInvolved = isCreator || isAcceptor;
  const canAccept = !isInvolved && bet.status === BetStatus.OPEN && userBalance >= bet.amount;
  
  const handleAccept = async () => {
    if (canAccept) {
      await onAccept(bet);
    } else if (userBalance < bet.amount) {
      toast.error(`Insufficient balance. You need ${bet.amount} $DARE points.`);
    }
  };
  
  const getTimeAgo = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Get appropriate border color based on bet status
  const getBorderColor = () => {
    switch (bet.status) {
      case BetStatus.OPEN: return '#1976d2';
      case BetStatus.ACTIVE: return '#4CAF50';
      case BetStatus.COMPLETED: return '#E5FF03';
      case BetStatus.CANCELLED: return '#F44336';
      default: return '#9E9E9E';
    }
  };

  // Get appropriate shadow color based on bet status
  const getShadowColor = () => {
    switch (bet.status) {
      case BetStatus.OPEN: return 'rgba(25, 118, 210, 0.5)';
      case BetStatus.ACTIVE: return 'rgba(76, 175, 80, 0.5)';
      case BetStatus.COMPLETED: return 'rgba(229, 255, 3, 0.5)';
      case BetStatus.CANCELLED: return 'rgba(244, 67, 54, 0.5)';
      default: return 'rgba(158, 158, 158, 0.5)';
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Box
      sx={{
        bgcolor: 'rgba(10, 25, 41, 0.8)',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: getBorderColor(),
        mb: 2,
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: `0 0 8px ${getShadowColor()}`,
        },
        width: '100%',
        position: 'relative'
      }}
    >
      {/* Expand/Collapse button - Always visible and fixed position */}
      <IconButton 
        size="small" 
        onClick={toggleExpanded}
        sx={{ 
          color: 'white', 
          position: 'absolute',
          top: '50%',
          transform: expanded ? 'translateY(-50%)' : 'translateY(-50%)',
          right: 8,
          zIndex: 2,
          bgcolor: 'rgba(0, 0, 0, 0.4)',
          width: 24,
          height: 24,
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.6)',
          }
        }}
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </IconButton>
      
      {/* Main info row */}
      <Box 
        sx={{ 
          py: 1.25,
          px: 2, 
          pr: { xs: 4, sm: 5 }, // Add extra padding on the right to accommodate the button
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: expanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          position: 'relative'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, mr: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: bet.is_mock 
                ? 'rgba(158, 158, 158, 0.5)' // Grayer color for mock bets
                : `hsl(${bet.id.charCodeAt(0) * 10}, 70%, 50%)`,
              width: 32,
              height: 32,
              mr: 1.5,
              fontSize: '0.875rem',
              flexShrink: 0
            }}
          >
            {bet.creator.charAt(2)}
          </Avatar>
          
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography 
                variant="body1" 
                color="white" 
                fontWeight="medium" 
                noWrap 
                sx={{ 
                  maxWidth: { xs: '160px', sm: '240px', md: '320px' } 
                }}
              >
                {bet.description || `Bet on match ${bet.matchId}`}
              </Typography>
              {bet.is_mock && (
                <Chip
                  label="Demo"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    bgcolor: 'rgba(158, 158, 158, 0.2)',
                    color: '#9E9E9E',
                    '& .MuiChip-label': { px: 0.75, py: 0 }
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="caption" color="text.secondary" noWrap>
                {truncateAddress(bet.creator)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>•</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {getTimeAgo(bet.timestamp)}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 1.5 },
          flexShrink: 0,
          flexWrap: 'nowrap',
          mr: { xs: 0, sm: 2 }
        }}>
          {bet.status === BetStatus.OPEN && canAccept && !expanded && (
            <Tooltip title="Accept this bet">
              <Button
                size="small"
                variant="contained"
                onClick={handleAccept}
                disabled={isProcessing}
                sx={{
                  minWidth: 'unset',
                  px: 1.5,
                  py: 0.5,
                  bgcolor: isProcessing ? 'rgba(229, 255, 3, 0.5)' : '#E5FF03',
                  color: 'black',
                  fontSize: '0.75rem',
                  height: '24px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: '#c9e200'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(229, 255, 3, 0.3)',
                    color: 'rgba(0, 0, 0, 0.5)'
                  },
                  display: { xs: 'none', sm: 'flex' }
                }}
              >
                {isProcessing ? <CircularProgress size={16} color="inherit" /> : 'Accept'}
              </Button>
            </Tooltip>
          )}
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#E5FF03',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              letterSpacing: '0.25px'
            }}
          >
            {bet.amount} $DARE
          </Typography>
          
          <StatusChip status={bet.status} />
        </Box>
      </Box>
      
      {/* Expanded details */}
      <Collapse in={expanded}>
        <Box sx={{ 
          p: 2, 
          pb: 3, // Extra bottom padding for mobile
          bgcolor: 'rgba(0, 0, 0, 0.2)', 
          fontSize: '0.75rem' 
        }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
            gap: { xs: 2, sm: 3 },
            mb: 2
          }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Match ID
              </Typography>
              <Typography variant="body2" color="white" sx={{ fontSize: '0.875rem' }}>
                {bet.matchId}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Team ID
              </Typography>
              <Typography variant="body2" color="white" sx={{ fontSize: '0.875rem' }}>
                {bet.teamId}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Bet ID
              </Typography>
              <Typography variant="body2" color="white" sx={{ fontSize: '0.875rem' }}>
                {truncateAddress(bet.id, 8, 4)}
              </Typography>
            </Box>
          </Box>
          
          {bet.status !== BetStatus.OPEN && bet.acceptor && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Accepted by
              </Typography>
              <Typography variant="body2" color="white" sx={{ fontSize: '0.875rem' }}>
                {truncateAddress(bet.acceptor)}
              </Typography>
            </Box>
          )}
          
          {bet.status === BetStatus.COMPLETED && bet.winnerId && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Winner
              </Typography>
              <Typography variant="body2" color="#E5FF03" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
                {truncateAddress(bet.winnerId)}
                {isCreator && bet.winnerId === bet.creator && ' (You)'}
                {isAcceptor && bet.winnerId === bet.acceptor && ' (You)'}
              </Typography>
            </Box>
          )}
          
          {bet.status === BetStatus.OPEN && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleAccept}
                disabled={!canAccept || isProcessing}
                startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{
                  bgcolor: isProcessing ? 'rgba(229, 255, 3, 0.5)' : '#E5FF03',
                  color: 'black',
                  fontSize: '0.875rem',
                  py: 0.75,
                  px: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: '#c9e200'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(229, 255, 3, 0.3)',
                    color: 'rgba(0, 0, 0, 0.5)'
                  }
                }}
              >
                {isProcessing ? 'Processing...' : 'Accept Bet'}
              </Button>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default MarketplaceBetCard; 