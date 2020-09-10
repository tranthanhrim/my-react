import _unescape from 'lodash/unescape';
import React, { Component } from 'react';
import { chains as UCMChains } from './current';
import _toArray from 'lodash/toArray';
import _min from 'lodash/min';
import papaparse from 'papaparse' ;

const countryCode = 'my';
// const chainNumberFile = 'ID-6.csv';
const chainFiles = [{
  lang: 'en',
  path: 'chain-data/my-090320/English Content.html',
}];

class ChainPageParser extends Component {
  constructor(props) {
    super(props);
    this.chainNumber = {
      id: {
        rule: name => name.replace(/[^A-Z0-9]/ig, ''),
        special: {
          'Gokana Ramen & Teppan': 'Gokana Ramen & Teppan',
          'A&W': 'AW',
          'Carl’s Jr': 'CarlsJr',
          'Xi Bo Ba': 'XIBOBA',
          'Shihlin’s Taiwan Street Snacks': 'Shihlin',
          'HAUS!': 'Haus',
          'Bebek Goreng H. Slamet': 'BebekGoreng',
          'McDonald’s': 'McDonalds',
          'J.Co Donuts & Coffee': 'JCoDonutCoffee',
          'Domino’s Pizza': 'DominosPizza',
          'SaladStop!': 'SaladStop',
        },
      },
      my: {
        rule: name => `60_${name.replace(/[^A-Z0-9]/ig, '_')}`,
        special: {},
      }
    };
  }

  componentDidMount() {
    this.loadFileAndRenderChainDom(chainFiles);

    setTimeout(() => {
      const chainMapLang1 = this.getChainMapFromDom(0, chainFiles[0].lang);
      // const chainMapLang2 = this.getChainMapFromDom(1, chainFiles[1].lang);

      const { newChains, existingChains } = this.mergeChainMaps([chainMapLang1]);

      // eslint-disable-next-line
      const { ucm, newChainAdded } = this.toNewUCMChain(newChains);
      const { ucm: eUCM, existingChainChanged } = this.toExistingUCMChain(existingChains);
      document.getElementById('ta-new-chains').value = ucm;
      document.getElementById('ta-existing-chains').value = eUCM;
      console.log('------New chains------');
      console.log('newChains', newChains);
      console.log('newChainAdded', newChainAdded);
      console.log('\n\n');
      console.log('------Existing chains------');
      console.log('existingChains', existingChains);
      console.log('existingChainChanged', existingChainChanged);
    }, 1000);
  }

  loadChainNumber = file => {
    fetch(`chain-data/chain_numbers/${file}`).then(res => res.text()).then(csv => {
      papaparse.parse(csv, {
        delimiter: ',',
        header: true,
        complete: result => {
          const chainNumberMap = result.data.reduce((acc, entity) => {
            const { chain_number, name } = entity;
            const iHyphen = name.lastIndexOf('-');
            const iLeftParenthesis = name.lastIndexOf('(');
            let iCut = null;
            if (iHyphen !== -1 || iLeftParenthesis !== -1) {
              if (iHyphen === -1) iCut = iLeftParenthesis;
              else if (iLeftParenthesis === -1) iCut = iHyphen;
              else iCut = _min([iHyphen, iLeftParenthesis]);
            }
            const formattedName = name.substring(0, iCut).trim();

            return {
              ...acc,
              [formattedName]: chain_number,
            };
          }, {});

          this.chainNumberMap = chainNumberMap;
        }
      });
    });
  };

  loadFileAndRenderChainDom = files => {
    const promises = files.map(chainFile => fetch(chainFile.path).then(y => y.text()).then(dom => ({
      dom,
      lang: chainFile.lang,
    })));
    Promise.all(promises).then(doms => {
      doms.forEach(({ dom, lang }, i) => {
        document.getElementById(`chain-dom${i}`).innerHTML = dom;
      });
    });
  };

  getChainMapFromDom = (domIndex, lang) => {
    const div = document.getElementById(`chain-dom${domIndex}`).getElementsByTagName('tbody')[0];
    const trs = div.getElementsByTagName('tr');
    const chains = {};
    const regexBreakLine = /<br>/gi;
    const regexQuote = /’/g;
    const regexColon = /:/g;
    for (let tr of trs) {
      const name = _unescape(tr.childNodes[3].innerHTML).replace(regexQuote, '\'');
      const breakLine = '\\\\n';

      if (name) {
        const url = tr.childNodes[4].lastChild.textContent;
        const content = tr.childNodes[5].innerHTML;
        const title = tr.childNodes[6].innerHTML;
        const meta = tr.childNodes[7].innerHTML;
        const image = tr.childNodes[8].firstChild.text;
        const code = url.substring(url.lastIndexOf('/') + 1);

        const chain = {
          code,
          name,
          url,
          image,
          content: [
            {
              lang,
              body: content && content.replace(regexBreakLine, breakLine).replace(regexQuote, '\'').replace(regexColon, '%3A'),
              meta: meta.replace(regexQuote, '\''),
              title: title.replace(regexQuote, '\''),
            }
          ]
        };

        if (code !== 'URL') {
          chains[code] = chain;
        }
      }
    }

    return chains;
  };

  mergeChainMaps = chainMaps => {
    const onlyOneLang = chainMaps.length < 2;
    const map1 = chainMaps[0];
    const map2 = onlyOneLang ? null : chainMaps[1];
    const array0 = _toArray(map1);
    const existingChains = [];

    if (!onlyOneLang && Object.keys(map1).length !== Object.keys(map2).length) {
      alert(`Chain key does not match between 2 sheets ${Object.keys(map1).length}, ${Object.keys(map2).length}`);
      return;
    }

    const newChains = array0.reduce((acc, chain) => {
      const chainCode = chain.code;

      if (!onlyOneLang && !map2[chainCode]) {
        console.log(`Chain key from first sheet cannot find in second sheet ${chainCode}`);
        return acc;
      }

      if (UCMChains[chainCode]) {
        existingChains.push(chain);
        return acc;
      }

      return acc.concat({
        ...chain,
        content: onlyOneLang ? chain.content : [
          ...chain.content,
          ...map2[chainCode].content,
        ] });
    }, []);

    return {
      newChains,
      existingChains,
    };
  };


  toNewUCMChain = chains => {
    const newChainAdded = {
      success: [],
      failed: [],
    };
    const result = chains.reduce((acc, chain) => {
      const single = this.toSingleUCMChain(chain);
      newChainAdded[single ? 'success' : 'failed'].push(chain.code);
      return single ? acc += `${single}\n` : acc;
    }, '');

    return {
      ucm: result,
      newChainAdded,
    };
  };

  toSingleUCMChain = chain => {
    const { name, code, content, image } = chain;
    let main = '';

    // const codeWithoutSuffix = code.substring(0, code.lastIndexOf('-') !== -1 ? code.lastIndexOf('-') : undefined);
    // const currentChain = UCMChains[codeWithoutSuffix];
    // console.log('currentChain', currentChain);

    if (!image) {
      console.log('Chain without image', chain.code);
      return null;
    }

    let numbers = '';
    if (this.chainNumber[countryCode].special[name]) {
      numbers = this.chainNumber[countryCode].special[name];
      console.log('special', `${name} | ${numbers}`);
    } else {
      numbers = this.chainNumber[countryCode].rule(name);
      console.log('normal', `${name} | ${numbers}`);
    }

    // eslint-disable-next-line
    main += `[chain.${code}]\nimage="${image}"\nchainName="${name}"\nnumbers='["${numbers}"]'\ncountries='["${countryCode.toUpperCase()}"]'\n`;

    let contentUCM = '';
    content.forEach(block => {
      const { lang, body, meta, title } = block;

      contentUCM += `[chain.${code}.locales.${countryCode}-${lang}]\nheading="\\"\\""\nbody="${body}"\npage_title="${title}"\nmeta_description="${meta}"\n\n`;
    });

    return `${main}\n${contentUCM}`;
  };

  toExistingUCMChain = chains => {
    const existingChainChanged = {
      success: [],
      failed: [],
    };
    const result = chains.reduce((acc, chain) => {
      const single = this.toSingleUCMChain(chain);
      existingChainChanged[single ? 'success' : 'failed'].push(chain.code);
      return single ? acc += `${single}\n` : acc;
    }, '');

    return {
      ucm: result,
      existingChainChanged,
    };
  };

  render() {
    return (
      <div>
        <h2>New chains</h2>
        <textarea id="ta-new-chains" style={{ width: '100%', height: '500px' }}/>
        <h2>Existing chains</h2>
        <textarea id="ta-existing-chains" style={{ width: '100%', height: '500px' }}/>
        <div id="chain-dom0" />
        <div id="chain-dom1" />
        <div id="chain-dom2" />
        <div id="chain-dom3" />
        <div id="chain-dom4" />
      </div>
    );
  }
}

export default ChainPageParser;
