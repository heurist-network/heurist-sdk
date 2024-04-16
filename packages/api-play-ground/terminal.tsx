import React from 'react';

interface TerminalProps {
  output: string;
}

const Terminal: React.FC<TerminalProps> = ({ output }) => {
  return (
    <div className="terminal" style={{marginTop:"53px"}}>
      <div className="output">${output}</div>
       <style jsx>{`
        .terminal {
          background-color: #000;
          color: #fff;
          padding: 10px;
          font-family: Consolas, 'Courier New', Courier, monospace;
          border-radius: 10px;          
          overflow-y: scroll;
          max-height: 600px; /* Increase height */
          width: 600px; /* Increase width */
        }
        .output {
          white-space: pre-wrap;
          color:#4AF626;
        }
      `}</style>
    </div>
  );
};

export default Terminal;
