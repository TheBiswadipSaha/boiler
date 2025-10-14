import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <div>hello world</div>
    </ThemeProvider>
  );
}

export default App;