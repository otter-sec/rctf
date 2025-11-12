import { Component } from 'preact'

export default class CtftimeCallback extends Component {
  componentDidMount() {
    const params = new URLSearchParams(location.search)
    window.opener.postMessage(
      {
        kind: 'ctftimeCallback',
        state: params.get('state'),
        ctftimeCode: params.get('code'),
      },
      location.origin
    )
    window.close()
  }

  render() {
    return null
  }
}
