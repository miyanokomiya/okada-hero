import * as React from 'react'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Slider from '@material-ui/core/Slider'
import { CompactPicker, ColorResult } from 'react-color'
import PropTypes from 'prop-types'
import { IConfig } from '../types'

export type Props = {
  config: IConfig
  onSubmit: (options: IConfig, force?: boolean) => void
}

const OptionForm: React.FC<Props> = props => {
  const [draftText, setDraftText] = React.useState(props.config.text)

  const onInputDraftText = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftText(e.currentTarget.value)
  }, [])

  const onInputFaceColor = React.useCallback(
    (color: ColorResult) => {
      props.onSubmit({
        ...props.config,
        faceColor: color.hex,
      })
    },
    [props],
  )

  const onInputWallColor = React.useCallback(
    (color: ColorResult) => {
      props.onSubmit({
        ...props.config,
        wallColor: color.hex,
      })
    },
    [props],
  )

  const onInputRotateSpeed = React.useCallback(
    (_, value: any) => {
      props.onSubmit({
        ...props.config,
        rotateSpeed: value,
      })
    },
    [props],
  )

  const onSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      props.onSubmit(
        {
          ...props.config,
          text: draftText,
        },
        true,
      )
    },
    [props, draftText],
  )

  return (
    <form onSubmit={onSubmit}>
      <Grid container>
        <Grid item>
          <Button type="submit" variant="contained">
            Reset
          </Button>
        </Grid>
      </Grid>
      <Grid container style={{ marginTop: '1rem' }}>
        <Grid item xs={12}>
          <Typography>Text</Typography>
          <TextField
            multiline
            fullWidth
            variant="outlined"
            value={draftText}
            onChange={onInputDraftText}
          />
        </Grid>
      </Grid>
      <Grid container style={{ marginTop: '1rem' }} spacing={2}>
        <Grid item>
          <Typography>Face</Typography>
          <CompactPicker color={props.config.faceColor} onChange={onInputFaceColor} />
        </Grid>
        <Grid item>
          <Typography>Wall</Typography>
          <CompactPicker color={props.config.wallColor} onChange={onInputWallColor} />
        </Grid>
      </Grid>
      <Grid container style={{ marginTop: '1rem' }} spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography>Auto Rotation</Typography>
          <Slider
            marks={[{ value: 0, label: '0' }]}
            step={0.5}
            min={-10}
            max={10}
            value={props.config.rotateSpeed}
            onChange={onInputRotateSpeed}
          />
        </Grid>
      </Grid>
    </form>
  )
}

OptionForm.propTypes = {
  config: PropTypes.shape({
    text: PropTypes.string.isRequired,
    faceColor: PropTypes.string.isRequired,
    wallColor: PropTypes.string.isRequired,
    rotateSpeed: PropTypes.number.isRequired,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
}
OptionForm.defaultProps = {}

export default OptionForm
