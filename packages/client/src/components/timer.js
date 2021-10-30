import config from '../config'
import withStyles from './jss'
import { useEffect, useState } from 'preact/hooks'
import { formatAbsoluteTimeWithTz } from '../util/time'

const Timer = withStyles(
  {
    card: {
      background: '#222',
      margin: 'auto',
    },
    section: {
      display: 'inline',
    },
    content: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      columnGap: '20px',
      margin: '20px 40px',
      textAlign: 'center',
    },
    time: {
      fontSize: '40px',
    },
    absolute: {
      gridColumn: 'span 4',
      fontSize: '15px',
      color: '#bbb',
    },
    sub: {
      gridColumn: 'span 4',
      marginTop: '10px',
      fontSize: '20px',
    },
    over: {
      margin: '20px 40px',
      fontSize: '20px',
      textAlign: 'center',
    },
  },
  ({ classes }) => {
    const [time, setTime] = useState(Date.now())
    useEffect(() => {
      const intervalId = setInterval(() => setTime(Date.now()), 1000)
      return () => clearInterval(intervalId)
    }, [])
    if (time > config.endTime) {
      return (
        <div className='row'>
          <div className={`card ${classes.card}`}>
            <div className={classes.over}>The CTF is over.</div>
          </div>
        </div>
      )
    }
    const targetEnd = time > config.startTime
    const targetTime = targetEnd ? config.endTime : config.startTime
    const timeLeft = targetTime - time
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60)) % 24
    const minutesLeft = Math.floor(timeLeft / (1000 * 60)) % 60
    const secondsLeft = Math.floor(timeLeft / 1000) % 60
    return (
      <div className='row'>
        <div className={`card ${classes.card}`}>
          <div className={classes.content}>
            <span className={classes.time}>{daysLeft}</span>
            <span className={classes.time}>{hoursLeft}</span>
            <span className={classes.time}>{minutesLeft}</span>
            <span className={classes.time}>{secondsLeft}</span>
            <span>Days</span>
            <span>Hours</span>
            <span>Minutes</span>
            <span>Seconds</span>
            <span className={classes.sub}>
              until {config.ctfName} {targetEnd ? 'ends' : 'starts'}
            </span>
            <span className={classes.absolute}>
              {formatAbsoluteTimeWithTz(targetTime)}
            </span>
          </div>
        </div>
      </div>
    )
  }
)

export default Timer
