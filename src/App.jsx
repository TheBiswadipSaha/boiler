import React from 'react'
import LiquidEtherGlass from './components/LiquidEtherGlass'
import LiquidShader from './components/LiquidShader';

function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Liquid Glass Background - Full Screen */}
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

      <div className='p-16'>
        {/* LiquidShader with fully styled content */}
        <LiquidShader style={{ height: '50vh', background: 'transparent', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          <div style={{ padding: '1px', width: '100%', height: '100%' }}>
            <div style={{backgroundColor:'#000000', width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'20px',
              borderRadius: '16px',
            }}>
              <div style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 'bold',
                top: '50px',
                left: '50px'
              }}>
                kjdbckjdbk
              </div>
              <div style={{

              }}>
                <button style={{
                  padding: '16px 48px',
                  fontSize: '18px',
                  fontWeight: '500',
                  backgroundColor: '#ff6f61',

                  color: '#ffffff',

                }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 15px 40px rgba(255, 111, 97, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 10px 30px rgba(255, 111, 97, 0.4)';
                  }}
                  onClick={() => alert('Button clicked!')}>
                  Click Me
                </button>
              </div>
            </div>
          </div>
        </LiquidShader>
      </div>

      
    </div>
  )
}

export default App