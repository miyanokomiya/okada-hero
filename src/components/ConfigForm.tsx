import * as React from 'react'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
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
          <Typography>Fill</Typography>
          <CompactPicker color={props.config.faceColor} onChange={onInputFaceColor} />
          <CompactPicker color={props.config.wallColor} onChange={onInputWallColor} />
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
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
}
OptionForm.defaultProps = {}

export default OptionForm
