import {
  BrowserRouter as Router,
  useRoutes,
  Navigate,
  useNavigate,
} from 'react-router-dom'

import 'cirrus-ui'
import withStyles from './components/jss'
import Header from './components/header'
import Footer from './components/footer'

import ErrorRoute from './routes/error'
import Home from './routes/home'
import Register from './routes/register'
import Login from './routes/login'
import Profile from './routes/profile'
import Challenges from './routes/challs'
import Scoreboard from './routes/scoreboard'
import Recover from './routes/recover'
import Verify from './routes/verify'
import CtftimeCallback from './routes/ctftime-callback'

import AdminChallenges from './routes/admin/challs'

import { ToastProvider } from './components/toast'

import { navigateRef } from './history-hack'

const LoggedOutRedir = <Navigate to='/' />
const LoggedInRedir = <Navigate to='/profile' />

function App({ classes }) {
  const loggedOut = !localStorage.token
  const hasPerms = localStorage.perms == 0

  const loggedOutPaths = [
    {
      element: <Register />,
      path: '/register',
      name: 'Register',
    },
    {
      element: <Login />,
      path: '/login',
      name: 'Login',
    },
    {
      element: <Recover />,
      path: '/recover',
    },
  ]

  const loggedInPaths = [
    {
      element: <Profile key='profile-private' />,
      path: '/profile',
      name: 'Profile',
    },
    {
      element: <Challenges />,
      path: '/challs',
      name: 'Challenges',
    },
  ]

  const adminPaths = [
    {
      element: hasPerms ? <AdminChallenges /> : LoggedOutRedir,
      path: '/admin/challs',
    },
  ]

  const allPaths = [
    {
      element: <ErrorRoute error='404' />,
      path: '*',
    },
    {
      element: <Home />,
      path: '/',
      name: 'Home',
    },
    {
      element: <Scoreboard />,
      path: '/scores',
      name: 'Scoreboard',
    },
    {
      element: <Profile key='profile-public' />,
      path: '/profile/:uuid',
    },
    {
      element: <Verify />,
      path: '/verify',
    },
    {
      element: <CtftimeCallback />,
      path: '/integrations/ctftime/callback',
    },
  ]

  loggedInPaths.forEach(route =>
    loggedOutPaths.push({
      element: LoggedOutRedir,
      path: route.path,
    })
  )
  loggedOutPaths.forEach(route =>
    loggedInPaths.push({ element: LoggedInRedir, path: route.path })
  )
  const currentPaths = [
    ...allPaths,
    ...(loggedOut ? loggedOutPaths : loggedInPaths),
    ...adminPaths,
  ]
  const headerPaths = currentPaths.filter(route => route.name !== undefined)

  const element = useRoutes(currentPaths)

  return (
    <div className={classes.root}>
      <ToastProvider>
        <Header paths={headerPaths} />
        <div className={classes.contentWrapper}>{element}</div>
        <Footer />
      </ToastProvider>
    </div>
  )
}

const StyledApp = withStyles(
  {
    '@global body': {
      overflowX: 'hidden',
    },
    // we show the google legal notice on each protected form
    '@global .grecaptcha-badge': {
      visibility: 'hidden',
    },
    // cirrus makes recaptcha position the modal incorrectly, so we reset it here
    '@global body > div[style*="position: absolute"]': {
      top: '10px !important',
    },
    root: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      background: '#111',
      color: '#fff',
      '& *:not(code):not(pre)': {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Noto Sans", "Oxygen", "Ubuntu", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" !important',
      },
      '& pre.code': {
        padding: '10px',
        background: 'var(--cirrus-code-bg)',
        borderRadius: '5px',
        margin: '10px 0',
        color: '#ccc',
        border: '1px solid #ffffff1a',
      },
      '& code': {
        padding: '.2em .4em',
        background: 'var(--cirrus-code-bg)',
        borderRadius: '3px',
        color: '#ccc',
        border: '1px solid #ffffff1a',
      },
    },
    '@global select': {
      background:
        "url(\"data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%204%205'%3E%3Cpath%20fill='%23667189'%20d='M2%200L0%202h4zm0%205L0%203h4z'/%3E%3C/svg%3E\") right .85rem center/.5rem .6rem no-repeat no-repeat #111 !important",
    },
    '@global :root': {
      '--cirrus-link': '#72b4e0',
      '--cirrus-link-dark': '#277edb',
      '--cirrus-select-bg': 'rgba(0, 161, 255, 0.4)',
      '--cirrus-code-bg': '#333',
    },
    contentWrapper: {
      flex: '1 0 auto',
    },
  },
  App
)

const HistoryHack = () => {
  const navigate = useNavigate()
  navigateRef.current = navigate
  return null
}

const WrappedApp = () => (
  <Router>
    <HistoryHack />
    <StyledApp />
  </Router>
)

export default WrappedApp
