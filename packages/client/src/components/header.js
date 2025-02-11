import { useMatch, Link } from 'react-router-dom'
import withStyles from './jss'
import LogoutButton from './logout-button'

const Match = ({ children: RenderProp, ...params }) => {
  const match = useMatch(params)
  return <RenderProp match={match} matches={match !== null} />
}

function Header({ classes, paths }) {
  const loggedIn = localStorage.getItem('token') !== null

  return (
    <div className='tab-container tabs-center'>
      <ul className={classes.list}>
        {paths.map(({ path, name }) => (
          <Match key={name} path={path}>
            {({ matches }) => (
              <li className={matches ? 'selected' : ''}>
                <Link to={path} className={classes.link}>
                  {name}
                </Link>
              </li>
            )}
          </Match>
        ))}
        {loggedIn && (
          <li>
            <LogoutButton className={classes.link} />
          </li>
        )}
      </ul>
    </div>
  )
}

export default withStyles(
  {
    link: {
      '&:focus': {
        boxShadow: 'none',
        // color copied from Cirrus styles - there is no variable for it
        borderBottomColor: 'rgba(240,61,77,.6)',
      },
      background: '#0000 !important',
      color: '#fff !important',
      padding: '.5rem .7rem !important',
    },
    list: {
      borderBottomColor: '#333 !important',
      '& li.selected a': {
        color: 'rgb(240,61,77) !important',
      },
    },
  },
  Header
)
