<template>
	<input
	type="text"
	ref="inputDomRef"
	:value="_value"
	@keydown="keydownHandler"
	@input="inputValueHandler"
	@blur="blurHandler"/>
</template>

<script setup>
/* Vue */
import { ref, computed, watch } from 'vue'

/* Emmitters */
const emit = defineEmits(['input', 'keydown', 'blur'])

/** props received
@options { Object } each item is an Object
	- digitGroupSeparator { String } default value => '.'
	- decimalChar: { String } default value => '.'
	- currencySymbolPlacement: { String } default value => 'p'
	- currencySymbol: { String } default value => ''
*/
const props = defineProps({
	value: [String, Number],
	options: Object
})

/*************************************************
*                                                *
*                     DATA                       *
*                                                *
*************************************************/
const _value = ref(props.value)
const inputDomRef = ref('')

const ALLOWED_SEPARATORS = [',', '.', '٫']
const INTEGER_PATTERN = '(0|[1-9]\\d*)'

/* we could also use selectionStart, since both props are the same when writing */
const currentCaretPositon = ref('')

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
	// alwaysAllowDecimalCharacter: true, /* not handle yet */
	showCurrencyOnHover: false, /* not handle yet */
	currencySymbolPlacement: 'p',
	currencySymbol: ''
	// minValue: 0, /* not handle yet */
	// maxValue: null /* not handle yet */
}

/* Joining default options with received */
const options = computed(() => {
	return {
		...defaultOptions,
		...props.options
	}
})

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
const isValidSeparator = key => { return !!ALLOWED_SEPARATORS.find(separator => separator === key) }
const isDigit = key => { return key.match(INTEGER_PATTERN) }

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

	/* Handling keydown on arrows to skip separators  */
	if (($event.key === 'ArrowLeft' || $event.key === 'ArrowRight') && !$event.shiftKey) {
		const charToValidate = $event.key === 'ArrowLeft' ? elem.value.charAt(elem.selectionEnd - 2) : elem.value.charAt(elem.selectionEnd + 1)

		if (charToValidate === options.value.digitGroupSeparator || charToValidate === options.value.decimalChar) {
			currentCaretPositon.value = $event.key === 'ArrowLeft' ? elem.selectionEnd - 1 : elem.selectionEnd + 1
			setCaretPosition(elem, currentCaretPositon.value)
		}
	}

	/* Preventing user from adding more than one decimalChar */
	if (isValidSeparator($event.key) && elem.value.includes(options.value.decimalChar)) {
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

	if (_value.value.length > (options.value.currencySymbol.length + 1)) {
		/* Creating a string with options.value.decimalsAllowed zeros */
		const decimalsNeeded = options.value.decimalsAllowed - checkDecimalCharsLength(_value.value)
		const decimals = Array.from({ length: decimalsNeeded }, (v, k) => '0').join('')

		if (_value.value.includes(options.value.decimalChar)) {
			$event.target.value = `${_value.value}${decimals}`
		} else {
			$event.target.value = `${_value.value}${options.value.decimalChar}${decimals}`
		}

		updateValue($event.target.value)
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
        if (isValidSeparator(valueArray[y]) || isDigit(valueArray[y])) {
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
	/*
	* First we will check if this value is a valid number
	*/
	if (isNaN(pastedValue)) {
		console.log(pastedValue, 'not being handle yet')
	} else {
		return parseFloat(pastedValue).toFixed(options.value.decimalsAllowed).replace('.', options.value.decimalChar)
	}
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
        const isSeparator = !!ALLOWED_SEPARATORS.find(separator => valArray[y].includes(separator)) && valArray[y] === options.value.decimalChar

		if (isSeparator) {
			decimalChars = (valArray.length - 1) - y
			break
		}
    }
	return decimalChars
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
	if (!options.value.currencySymbol.length || !value.length) return value

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

/* Update _value and emit it without format and currency */
const updateValue = value => {
	_value.value = value
	emit('input', formatToNumber(value))
}

/*
* Converts string to number and returns it
@value { String }
@return { Number }
*/
const formatToNumber = value => {
	const decimals = checkDecimalCharsLength(value)
	let valueToEmit = unformat(value)

	if (!valueToEmit.length) return null

	valueToEmit = parseFloat(applyingDecimals(valueToEmit, decimals, true))

	return valueToEmit
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

/* Formating our value on create, in case we have a value already */
setTimeout(() => handleValueChange(inputDomRef.value, true), 0)
</script>
