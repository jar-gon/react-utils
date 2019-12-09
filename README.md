## FormX

submitForm() => void: check fields and submit form
onSubmit(event: Event) => void: submit event handler from Form of Antd

## FormComponent

submitForm() => void: function from FormX, call formSubmit automatically
formInit() => void: init event handler
formSubmit(values: Dictionary) => void: submit event handler

## SimpleForm

onSubmit(values: Dictionary) => void: submit event handler

## FormModalComponent

submitForm() => void: function from FormX, call formSubmit automatically
close() => void: call submitForm
formInit() => void: init event handler
formSubmit(values: Dictionary) => void: submit event handler, call onClose automatically
onClose(values: Dictionary) => void: close event handler

## SimpleFormModalComponent

form: SimpleFormRef
close() => void: call form.submit
onSubmit(values: Dictionary) => void: submit event handler, call onClose automatically
onClose(values: Dictionary) => void: close event handler

## ModalComponent

close(state?: any) => void: close modal, call onClose automatically
onClose(state?: any) => void: close event handler
