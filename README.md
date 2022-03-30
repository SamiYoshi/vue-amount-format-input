# vue-amount-format-input

### To Install
```
npm install --save vue-amount-format-input
```
Once you have installed the package, in your entry file of the repository (main.js) if you are using it in a Vue CLI project. Write the import command

```
import AmountFormatInputInstall from 'vue-amount-format-input'

app.use(AmountFormatInputInstall)
```

### Options this input support and its defaults values:
```
options = {
	digitGroupSeparator: '',
	decimalChar: '.',
	currencySymbolPlacement: 'p',
	currencySymbol: '',
	maxValue: 99999999999999.98
}
```


### TODO List

#### Behaviours
- copy-paste > format when it's not a Number
- prevent first char from being zero, when no decimalChar is placed after

#### Options to be added to input:
- emptyInputBehavior
- decimalsAllowed
- showCurrencyOnHover
