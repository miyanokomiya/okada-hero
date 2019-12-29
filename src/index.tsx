import 'regenerator-runtime/runtime'
import * as React from 'react'
import { render } from 'react-dom'
import Link from '@material-ui/core/Link'
import ConfigForm from './components/ConfigForm'
import Canvas from './components/Canvas'
import { IConfig } from './types'

const CONFIG_KEY = 'config_0'

const defaultConfig = {
  text: '岡田\n見てるか？',
  faceColor: 'green',
  wallColor: 'yellow',
  rotateSpeed: 0,
}
const restoredConfig = {
  ...defaultConfig,
  ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'),
}

export const App: React.FC = () => {
  const [count, refresh] = React.useState(0)
  const [config, setConfig] = React.useState(restoredConfig)

  const onSubmit = React.useCallback(
    (config: IConfig, force = false) => {
      setConfig(config)
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
      if (force) refresh(count + 1)
    },
    [count],
  )

  return (
    <div>
      <Canvas
        width={window.innerWidth - 16}
        height={innerHeight * 0.7}
        config={config}
        count={count}
      />
      <div style={{ marginTop: '1rem' }}>
        <ConfigForm config={config} onSubmit={onSubmit} />
      </div>
      <Link href="https://github.com/miyanokomiya/okada-hero">Github</Link>
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  render(<App />, root)
}
