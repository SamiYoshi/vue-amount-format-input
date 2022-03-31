<template>
	<input
	type="text"
	ref="inputDomRef"
	:value="_value"
	:placeholder="placeholder"
	@keydown="keydownHandler"
	@input="inputValueHandler"
	@focus="focusHandler"
	@blur="blurHandler"
	@mouseover="mouseOverHandler"
	@mouseleave="mouseLeaveHandler"/>
</template>

<script setup>
/* Vue */
import { ref, computed, watch, onMounted } from 'vue'

/* Emmitters */
const emit = defineEmits(['input', 'keydown', 'blur'])

/** props received
@value { String, Number }
@placeholder { String }
@options { Object } each item is an Object
	- digitGroupSeparator { String } default value => '.'
	- decimalChar: { String } default value => '.'
	- alwaysAllowDecimalCharacter { Boolean } default value => true
	- showCurrencyOnFocus: { Boolean } default value => false
	- showCurrencyOnHover: { Boolean } default value => false
	- currencySymbolPlacement: { String } default value => 'p'
	- currencySymbol: { String } default value => ''
	- maxValue: { String } default value => 99999999999999.98
*/
const props = defineProps({
	value: [String, Number],
	placeholder: String,
	options: Object
})

/*************************************************
*                                                *
*                   Options                      *
*                                                *
*************************************************/
const defaultOptions = {
	emptyInputBehavior: null, /* not handle yet */
	digitGroupSeparator: '',
	decimalChar: '.',
	decimalsAllowed: 2, /* not handle yet */
	alwaysAllowDecimalCharacter: true,
	showCurrencyOnFocus: false,
	showCurrencyOnHover: false,
	currencySymbolPlacement: 'p',
	currencySymbol: '',
	maxValue: 99999999999999.98 /* Max value before js start rounding values */
}

/* Joining default options with received */
const options = computed(() => {
	return {
		...defaultOptions,
		...props.options,
		maxValue: !props.options.maxValue || props.options.maxValue > defaultOptions.maxValue ? defaultOptions.maxValue : props.options.maxValue
	}
})

/*************************************************
*                                                *
*                     DATA                       *
*                                                *
*************************************************/
const _value = ref(props.value > options.value.maxValue ? '' : props.value)
const inputDomRef = ref('')
const showCurrency = ref(false)
const inputOnFocus = ref(false)

const ALLOWED_DECIMAL_SEPARATORS = [',', '.', '٫']
const INTEGER_PATTERN = '(0|[1-9]\\d*)'

/* we could also use selectionStart, since both props are the same when writing */
const currentCaretPositon = ref('')

/*************************************************
*                                                *
*                   WATCHERS                     *
*                                                *
*************************************************/
/* We want to watch external changes on value and re-format our input value when it changes */
watch(() => props.value, (newVal, oldVal) => {
	if (newVal === formatToNumber(_value.value)) return

	_value.value = newVal
	setTimeout(() => handleValueChange(inputDomRef.value, true), 0)
})

/* Watching if currency change, and reformat our value */
watch(() => options.value.currencySymbol, (newVal, oldVal) => {
	_value.value = changeCurrencySymbol(_value.value, newVal, oldVal)
})

/*************************************************
*                                                *
*                VALIDATORS HELPERS              *
*                                                *
*************************************************/
const isValidSeparator = key => { return !!ALLOWED_DECIMAL_SEPARATORS.find(separator => separator === key) }
const isDigit = key => { return !!key.match(INTEGER_PATTERN) }

/*************************************************
*                                                *
*              VALUE CHANGE HANDLERS             *
*                                                *
*************************************************/
/*
* Function to handle onKeydown
@$event { DOM Event }
@return { void }
*/
const keydownHandler = $event => {
	emit('keydown', $event)

	const elem = $event.target

	if (!options.value.alwaysAllowDecimalCharacter && isValidSeparator($event.key)) {
		$event.preventDefault()
		return
	}

	/* Handling keydown on arrows to skip separators  */
	if (($event.key === 'ArrowLeft' || $event.key === 'ArrowRight') && !$event.shiftKey) {
		const charToValidate = $event.key === 'ArrowLeft' ? elem.value.charAt(elem.selectionEnd - 2) : elem.value.charAt(elem.selectionEnd + 1)

		if (charToValidate === options.value.digitGroupSeparator || charToValidate === options.value.decimalChar) {
			currentCaretPositon.value = $event.key === 'ArrowLeft' ? elem.selectionEnd - 1 : elem.selectionEnd + 1
			setCaretPosition(elem, currentCaretPositon.value)
		}
	}

	/* Preventing zeros from being inserted at left of number if we already have a decimalChar */
	if ($event.key === '0' &&
		elem.selectionEnd === options.value.currencySymbol.length + 1 &&
		elem.value.includes(options.value.decimalChar)) {
		$event.preventDefault()
		return
	}

	/* Replacing zero at left, if another number is inserted at left of decimalChar */
	if (isDigit($event.key) &&
		elem.value.charAt(options.value.currencySymbol.length + 1) === '0' &&
		elem.selectionEnd - 1 === options.value.currencySymbol.length + 1) {
		/* saving caret position for setting it later */
		currentCaretPositon.value = elem.selectionEnd + 1
		elem.value = stringReplaceAt(elem.value, options.value.currencySymbol.length + 1, $event.key)
		setCaretPosition(elem, currentCaretPositon.value)

		updateValue(elem.value)
		$event.preventDefault()
		return
	}

	/* Preventing user from adding more than one decimalChar */
	if (isValidSeparator($event.key) && elem.value.includes(options.value.decimalChar)) {
		if (isValidSeparator(elem.value.charAt(elem.selectionEnd))) {
			currentCaretPositon.value = elem.selectionEnd + 1
			setCaretPosition(elem, currentCaretPositon.value)
		}
		$event.preventDefault()
		return
	}

	/* If we have no decimalChar, we are changing the decimalChar entered to the one in our options */
	if (isValidSeparator($event.key) && !elem.value.includes(options.value.decimalChar)) {
		elem.value = elem.value + options.value.decimalChar

		updateValue(elem.value)
		$event.preventDefault()
		return
	}

	/* Preventing user from writinig more than two decimals chars */
	if (isDigit($event.key) &&
		checkDecimalCharsLength(elem.value) >= options.value.decimalsAllowed &&
		elem.selectionStart === elem.selectionEnd &&
		elem.selectionEnd === elem.value.length) $event.preventDefault()

	/*
	* If we already have 2 decimals chars,
	* and user is trying to insert another one, we will want to change the next decimal to new inserted value
	*/
	if (isDigit($event.key) &&
		checkDecimalCharsLength(elem.value) >= options.value.decimalsAllowed &&
		elem.selectionEnd >= (elem.value.length - options.value.decimalsAllowed) &&
		elem.selectionEnd !== elem.value.length) {
		/* saving caret position for setting it later */
		currentCaretPositon.value = elem.selectionEnd + 1
		elem.value = stringReplaceAt(elem.value, elem.selectionEnd, $event.key)
		setCaretPosition(elem, currentCaretPositon.value)

		updateValue(elem.value)
		$event.preventDefault()
	}
}

/*
* Function to handle onBlur
@$event { DOM Event }
@return { void }
*/
const blurHandler = $event => {
	emit('blur', $event)
	inputOnFocus.value = false

	if (_value.value.length > (options.value.currencySymbol.length + 1) && options.value.alwaysAllowDecimalCharacter) {
		/* Creating a string with options.value.decimalsAllowed zeros */
		const decimalsNeeded = options.value.decimalsAllowed - checkDecimalCharsLength(_value.value)
		const decimals = Array.from({ length: decimalsNeeded }, (v, k) => '0').join('')

		if (_value.value.includes(options.value.decimalChar)) {
			$event.target.value = `${_value.value}${decimals}`
		} else {
			$event.target.value = `${_value.value}${options.value.decimalChar}${decimals}`
		}

		updateValue($event.target.value)
	} else {
		setCurrencyShowValue(false)
	}
}

/* Logic to display currencySymbol on Focus / mouseOverHandler / mouseLeaveHandler, when input is empty */
const focusHandler = $event => {
	inputOnFocus.value = true
	setCurrencyShowValue(true)
}
const mouseOverHandler = $event => { if (options.value.showCurrencyOnHover) setCurrencyShowValue(true) }
const mouseLeaveHandler = $event => { if (!inputOnFocus.value) setCurrencyShowValue(false) }

const setCurrencyShowValue = state => {
	showCurrency.value = state
	if (_value.value.length <= (options.value.currencySymbol.length + 1)) {
		setTimeout(() => handleValueChange(inputDomRef.value, true), 0)
	}
}

/*
* Function to handle onInput
@$event { DOM Event }
@return { void }
*/
const inputValueHandler = $event => {
	const elem = $event.target

	/* Removing DecimalChar if user deletes all decimalChars */
	if ($event.inputType === 'deleteContentBackward' && elem.value.includes(options.value.decimalChar)) {
		var checkIfDecimals = elem.value.split(options.value.decimalChar)[1]
		if (checkIfDecimals.length === 0) elem.value = elem.value.split(options.value.decimalChar)[0]
	}

	currentCaretPositon.value = elem.selectionEnd
	handleValueChange(elem, $event.inputType === 'insertFromPaste')
}

/*
* Removing all characters not allowed in numbers and separators
@elem { HTML ELEM }
@insertedFromPaste { Boolean }
@return { string }
*/
const handleValueChange = (elem, insertedFromPaste) => {
	elem.value = removingUnwantedChars(elem.value)

	if (insertedFromPaste) elem.value = handlePasteValue(elem.value)
	const decimals = checkDecimalCharsLength(elem.value)

	if (validateIfBigThenMaxValue(elem.value)) {
		elem.value = _value.value
		currentCaretPositon.value = currentCaretPositon.value + options.value.currencySymbol.length
		setCaretPosition(elem, currentCaretPositon.value)
		return
	}
	elem.value = unformat(elem.value)
	elem.value = format(elem.value, decimals)
	setCaretPosition(elem, currentCaretPositon.value)

	updateValue(elem.value)
}

/*
* Removing all characters not allowed in numbers and separators
@value { String }
@return { string }
*/
const removingUnwantedChars = value => {
    var valueArray = value.split('')
	var valueArrayLength = valueArray.length

	var newValueArray = []

    for (var y = 0; y < valueArrayLength; y++) {
        if ((isValidSeparator(valueArray[y]) && options.value.alwaysAllowDecimalCharacter) || isDigit(valueArray[y])) {
			newValueArray.push(valueArray[y])
		} else {
			/* if we remove a char before our caret position, we need to subtract 1 to it's position for every nonvalid char */
			currentCaretPositon.value--
		}
    }
    return newValueArray.join('')
}

/** Validating pastedValue decimals and formats
@payload { string }
@return { number }
*/
const handlePasteValue = pastedValue => {
	let value = removingUnwantedChars(pastedValue)

	/*
	* Second we will check if this value is a valid number
	*/
	if (!isNaN(value)) return parseFloatAndFormat(value)

	/*
	* Validating how many separators exist in our string, and which ones
	*/
	const separatorsInString = [] // { separator: count }
	ALLOWED_DECIMAL_SEPARATORS.forEach(separator => {
		if (!value.includes(separator)) return

		const count = value.length - value.replaceAll(separator, '').length
		separatorsInString.push({ separator: separator, count: count })
	})

	/* If we have only one separator we will treat it as our decimalChar separator */
	if (separatorsInString.length === 1 && separatorsInString[0].count === 1) {
		value = value.replace(separatorsInString[0].separator, '.')
		return parseFloatAndFormat(value)
	}

	/*
	* If we have more than one separator,
	* we will check if one of them appears only one time, and treat it as our decimalChar separator
	* We will use the first one we find
	*/
	const separatorUsedOnce = separatorsInString.find(obj => obj.count === 1)
	if (separatorsInString.length && !!separatorUsedOnce) {
		separatorsInString.filter(obj => obj.separator !== separatorUsedOnce.separator).forEach(separator => {
			value = value.replaceAll(separator.separator, '')
		})

		value = value.replace(separatorUsedOnce.separator, '.')
		return parseFloatAndFormat(value)
	}

	ALLOWED_DECIMAL_SEPARATORS.forEach(separator => { value = value.replaceAll(separator, '') })

	return parseFloatAndFormat(value)
}

const parseFloatAndFormat = value => {
	if (!options.value.alwaysAllowDecimalCharacter) return parseFloat(value)
	return parseFloat(value).toFixed(options.value.decimalsAllowed).replace('.', options.value.decimalChar)
}

/*
* Validating how many decimals we have, we will need this to format our value again
@payload { string }
@return { number }
*/
const checkDecimalCharsLength = value => {
	const val = value.toString()

	/* var to save how many decimals chars value has */
	let decimalChars = null
	if (val.length === 0) return decimalChars

	const valArray = val.split('')

    for (var y = (valArray.length - 1); y >= (valArray.length - 3) && y > 0; y--) {
		const value = valArray[y]
        const isSeparator = !!ALLOWED_DECIMAL_SEPARATORS.find(separator => valArray[y].includes(separator)) && valArray[y] === options.value.decimalChar

		if (isSeparator) {
			decimalChars = (valArray.length - 1) - y
			break
		}
    }
	return decimalChars
}

/* Validating if number is bigger then maxValue, if so change currentCaretPositon value */
const validateIfBigThenMaxValue = value => {
	return Number(value.replaceAll('.', '').replace(',', '.')) > options.value.maxValue
}

/*
* Unformating our value to only have numbers in our string
@value { String }
@return { string }
*/
const unformat = value => {
	const val = value.toString()
	const numbers = val.replace(/\D+/g, '')

	currentCaretPositon.value = currentCaretPositon.value - (val.length - numbers.length)
	return numbers
}

/*
* Formating our value to display on input
@value { String }
@decimals { Number }
@return { string }
*/
const format = (value, decimals) => {
	let _value = value

	_value = applyingDecimals(_value, decimals)
	_value = applyingGroupSeparator(_value, decimals)
	_value = applyingCurrencySymbol(_value)
	return _value
}

/*
* Adding our decimal character to amount string
@value { String }
@decimals { Number }
@emitValue { Boolean }
@return { string }
*/
const applyingDecimals = (value, decimals, emitValue) => {
	let _value = value
	const decimalChar = emitValue ? '.' : options.value.decimalChar

	/* applying decimals if exist */
	if (decimals !== null) {
		/* applying separator from our options */
		_value = _value.slice(0, _value.length - decimals) + decimalChar + _value.slice(_value.length - decimals)
		currentCaretPositon.value++
	}

	return _value
}

/*
* Adding our digitGroupSeparator to amount string
@value { String }
@decimals { Number }
@return { string }
*/
const applyingGroupSeparator = (value, decimals) => {
	let separators = 0
	let _val = value.split(options.value.decimalChar)[0]
	const _decimals = decimals !== null ? `${options.value.decimalChar}${value.split(options.value.decimalChar)[1]}` : ''
	const valArray = _val.split('')
	const valArrayLength = valArray.length

	for (var i = 0; i < valArrayLength; i++) {
		if (i !== 0 && (valArrayLength - i) % 3 === 1 && (i - 2) > 0) {
			const sliceIndex = i - 2 + separators
			_val = _val.slice(0, sliceIndex) + options.value.digitGroupSeparator + _val.slice(sliceIndex)
			separators++
			currentCaretPositon.value++
		}
	}
	return `${_val}${_decimals}`
}

/*
* Adding currency to amount string
@value { String }
@return { String }
*/
const applyingCurrencySymbol = value => {
	if ((!options.value.currencySymbol.length || !value.length) && !showCurrency.value) return value

	if (options.value.currencySymbolPlacement === 'p') {
		currentCaretPositon.value = currentCaretPositon.value + options.value.currencySymbol.length + 1 /* this 1 is the space between currency and value */
		return `${options.value.currencySymbol} ${value}`
	} else {
		return `${value} ${options.value.currencySymbol}`
	}
}

/*
* Replace current currency for new one
@value { String }
@newCurrency { String }
@oldCurrency { String }
@return { String }
*/
const changeCurrencySymbol = (value, newCurrency, oldCurrency) => {
	return value.replace(oldCurrency, newCurrency)
}

/*
* Converts string to number and returns it
@value { String }
@return { Number }
*/
const formatToNumber = value => {
	const decimals = checkDecimalCharsLength(value)
	let valueNumbered = unformat(value)

	if (!valueNumbered.length) return null

	valueNumbered = parseFloat(applyingDecimals(valueNumbered, decimals, true))

	return valueNumbered
}

/* Position input caret in specific position */
const setCaretPosition = (elem, position) => {
	elem.setSelectionRange(position, position)
}

/*
* Replaces a number in our value string
@string { String }
@index { Number }
@replacementValue { String }
@return { string }
*/
const stringReplaceAt = (string, index, replacementValue) => {
	return string.substring(0, index) + replacementValue + string.substring(index + 1)
}

/* Update _value and emit it without format and currency */
const updateValue = value => {
	_value.value = value
	emit('input', formatToNumber(value))
}

onMounted(() => {
	if (props.value > options.value.maxValue) {
		console.warn(`Value <${props.value}> falls out of our maxValue <${options.value.maxValue}>`)
		return
	}
	handleValueChange(inputDomRef.value, true)
})
</script>
