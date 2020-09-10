import React, { Component } from 'react';
// import logo from './logo.svg';
import './App.css';
import ChainPageParser from './components/chain-page-parser';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    fetch('https://food.grab.dev:3000/cak').then(data => console.log('data', data));
  }


  render() {
    return (
      <div className="App">
        <ChainPageParser />
        {/*<header className="App-header">*/}
        {/*  <img src={logo} className="App-logo" alt="logo" />*/}
        {/*  <p>*/}
        {/*    Edit <code>src/App.js</code> and save to reload.*/}
        {/*  </p>*/}
        {/*  <a*/}
        {/*    className="App-link"*/}
        {/*    href="https://reactjs.org"*/}
        {/*    target="_blank"*/}
        {/*    rel="noopener noreferrer"*/}
        {/*  >*/}
        {/*    Learn React*/}
        {/*  </a>*/}
        {/*</header>*/}
      </div>
    );
  }
}

export default App;
