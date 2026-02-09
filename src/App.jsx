import React from 'react'
import LiquidEtherGlass from './components/LiquidEtherGlass'
import Ballpit from './components/Ballpit'

function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Liquid Glass Background */}
      <LiquidEtherGlass
        colors={['#5227FF', '#FF9FFC', '#B19EEF']}
        glassIntensity={0.1}
        refractionStrength={0.2}
        causticStrength={0.5}
        glassOpacity={0.85}
        mouseForce={25}
        cursorSize={150}
        autoDemo={false} // Disable auto demo to rely on mouse movement
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}
      />

      <div className='absolute top-0 w-[50vw] h-[50vh]'>
      <Ballpit
        objectCount={50}
        minSize={0.7}
        maxSize={1.4}
        colors={['#5227FF', '#FF9FFC', '#B19EEF']}
        gravity={0}
        wallBounce={0.88}
        maxVelocity={0.22}
        mouseForce={35}
        mouseRadius={2.5}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: '50%',
          zIndex: 1
        }}
      />
      </div>
      

      {/* Content Layer */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none' // Allow mouse events to pass through to background
      }}>
        <div style={{
          pointerEvents: 'auto', // Re-enable pointer events for interactive content
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ margin: 0, marginBottom: '1rem' }}>Liquid Glass</h1>
          <p style={{ fontSize: '1rem', margin: 0, opacity: 0.8 }}>
            Move your mouse to interact with the fluid
          </p>
        </div>
      </div>
    </div>
  )
}

export default App