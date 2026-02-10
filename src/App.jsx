import React from 'react'
import LiquidEtherGlass from './components/LiquidEtherGlass'
import LiquidShader from './components/LiquidShader';
import GravityPhysics from './components/Gravityphysics';

function App() {
  return (
    <div style={{ height: '100vh', position: 'relative' }}>

      {/* Liquid Glass Background - Full Screen (Behind everything) */}
      <LiquidEtherGlass
        colors={['#5227FF', '#FF9FFC', '#B19EEF']}
        glassIntensity={0.1}
        refractionStrength={0.2}
        causticStrength={10}
        glassOpacity={0.85}
        mouseForce={80}
        cursorSize={20}
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

      {/* Liquid Shader - Top Half (Above the glass) */}
      <div className='h-[50vh] relative' style={{ zIndex: 1 }}>
        <LiquidShader>
          <div className='h-[100%] p-3'>
            <GravityPhysics />
          </div>
        </LiquidShader>
      </div>

    </div>
  )
}

export default App