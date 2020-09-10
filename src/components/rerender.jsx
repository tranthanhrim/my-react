import React, {Component} from 'react';

class Rerender extends Component {
  render() {
    const { data } = this.props;
    console.log('Rerender');
    return (
      <div>
        {JSON.stringify(data)}
      </div>
    );
  }
}

export default Rerender;
