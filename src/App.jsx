import React from 'react'
import LiquidEtherGlass from './components/LiquidEtherGlass'

function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Liquid Glass Background - Full Screen */}
      <LiquidEtherGlass
        colors={['#5227FF', '#FF9FFC', '#B19EEF']}
        glassIntensity={0.1}
        refractionStrength={0.2}
        causticStrength={0.5}
        glassOpacity={0.85}
        mouseForce={25}
        cursorSize={150}
        autoDemo={false}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}
      />

      
    </div>
  )
}

export default App