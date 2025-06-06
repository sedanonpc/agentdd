import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Terminal } from 'lucide-react';
import DareDevilMessage from './DareDevilMessage';
import { Message } from '../../types';

interface DareDevilChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DareDevilChatModal: React.FC<DareDevilChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello, I'm DareDevil, your NBA betting advisor. How can I assist with your sportsbetting strategy today?",
      sender: 'daredevil',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate DareDevil response after a short delay
    setTimeout(() => {
      const responses = [
        "Based on recent performance metrics, I'd recommend focusing on under bets for teams playing back-to-back games.",
        "The Lakers' defensive rating has improved by 8.2 points in their last 5 games. This could present value in their upcoming matchups.",
        "Historical data shows a 67% success rate for home underdogs after a loss when playing against teams on a winning streak.",
        "My analysis of player prop markets suggests there's value in the rebounds market, particularly for centers against teams ranking bottom 5 in rebounding percentage.",
        "Teams coming off 3+ day rest periods have covered the spread 58% of the time this season. Worth considering for your next bet."
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const daredevilMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: randomResponse,
        sender: 'daredevil',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, daredevilMessage]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-console-gray-terminal/90 border-1 border-red-600 shadow-glow-red m-4 max-h-[80vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="bg-red-900/90 p-3 flex items-center justify-between">
          <div className="flex items-center">
            <Terminal className="h-5 w-5 text-red-400 mr-2" />
            <h2 className="text-console-white font-mono font-bold">DAREDEVIL_ANALYSIS_TERMINAL</h2>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-console-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-console-gray-terminal/80">
          {messages.map(message => (
            message.sender === 'daredevil' ? (
              <DareDevilMessage key={message.id} message={message} />
            ) : (
              <div key={message.id} className="flex justify-end my-4">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-console-blue/30 border-1 border-console-blue text-console-white shadow-glow">
                  <div className="text-sm font-mono">{message.content}</div>
                  <div className="text-xs mt-2 text-console-white-dim text-right">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="p-3 border-t border-red-900/50 flex items-center bg-console-black/50">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask DareDevil for betting advice..."
            className="flex-1 bg-console-black/80 border-1 border-red-900/70 text-console-white px-3 py-2 font-mono text-sm focus:outline-none focus:border-red-500 focus:shadow-input-glow-red"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim()}
            className="ml-2 bg-red-600 hover:bg-red-700 p-2 text-white disabled:opacity-50 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DareDevilChatModal; 