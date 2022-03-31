# vue-amount-format-input

Inspired by [AutoNumeric](https://github.com/autoNumeric/autoNumeric/), after using it for many years, decided to create my own amount format input for Vue3.
Made this focused on my needs for my personal projects, but feel free to open issues for new behaviours or problems you found, I'll try my best to help you.

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
	showCurrencyOnFocus: false,
	showCurrencyOnHover: false,
	currencySymbolPlacement: 'p',
	currencySymbol: '',
	maxValue: 99999999999999.98
}
```


### TODO List

#### Behaviours
- copy-paste > format when it's not a Number

#### Options to be added to input:
- emptyInputBehavior
- decimalsAllowed
