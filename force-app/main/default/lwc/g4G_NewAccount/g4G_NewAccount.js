import { LightningElement, wire, track } from 'lwc';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import { createRecord, getRecord  } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import ACCOUNT_OBJECT from '@salesforce/schema/Account';
import TYPE_FIELD from '@salesforce/schema/Account.Type';
import COUNTRY_FIELD from '@salesforce/schema/Account.MGR_Country__c';
import RELATEDPARTY_FIELD from '@salesforce/schema/Account.Related_Parties_Transactions__c';
import getIndustries from '@salesforce/apex/G4G_GicsAccountComponent.getIndustries';
import getSubIndustries from '@salesforce/apex/G4G_GicsAccountComponent.getSubIndustries';
import USERID from '@salesforce/user/Id';

export default class G4G_NewAccount extends NavigationMixin(LightningElement) {
    @track isModalOpen = true;
    @track countryOptions = [];
    @track relatedOptions = [];
    @track typeOptions = [];
    @track industryOptions = [];
    @track subIndustryOptions = [];
    @track accountRecord = {
        Name: '',
        OwnerId: USERID,
        Website: '',
        Type: '',
        MGR_Country__c: '',
        Related_Parties_Transactions__c: '',
    };
    recordTypeId;
    userName;
    selectedIndustry;
    selectedSubIndustry;

    get isSubIndustryDisabled() {
        return !this.selectedIndustry;
    }

    @wire(getRecord, { recordId: USERID, fields: 'User.Name' })
    wiredUser({ error, data }) {
        if (data) {
            this.userName = data.fields.Name.value;
        } else if (error) {
            console.error('Error retrieving user name', error);
        }
    }

    @wire(getObjectInfo, { objectApiName: ACCOUNT_OBJECT })
    objectInfoHandler({ data }) {
        if (data) {
            this.recordTypeId = data.defaultRecordTypeId;
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: TYPE_FIELD })
    picklistHandlerType({ data }) {
        if (data) {
            this.typeOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: COUNTRY_FIELD })
    picklistHandlerCountry({ data }) {
        if (data) {
            this.countryOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$recordTypeId', fieldApiName: RELATEDPARTY_FIELD })
    picklistHandlerRelated({ data }) {
        if (data) {
            this.relatedOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        }
    }

    @wire(getIndustries)
    wiredIndustries({ error, data }) {
        if (data) {
            this.industryOptions = data.map(industry => ({
                label: industry.Name,
                value: industry.Id
            }));
        } else if (error) {
            console.error('Error loading industries', error);
        }
    }

    handleIndustryChange(event) {
        this.selectedIndustry = event.detail.value;
        this.selectedSubIndustry = null;
        
        if (this.selectedIndustry) {
            this.loadSubIndustries();
        }
    }
    
    handleSubIndustryChange(event) {
        this.selectedSubIndustry = event.detail.value;
    }

    loadSubIndustries() {
        getSubIndustries({ industryId: this.selectedIndustry })
            .then(result => {
                this.subIndustryOptions = result.map(sub => ({
                    label: sub.Name,
                    value: sub.Id
                }));
            })
            .catch(error => {
                console.error('Error loading sub-industries', error);
            });
    }

    // Captura de cambios en los campos
    handleInputChange(event) {
        const { name, value } = event.target;
        this.accountRecord[name] = value;
    }

    // Botones: Cancel, Save & Save & New
    handleClick(event) {
        const action = event.target.label;

        switch (action) {
            case 'Cancel':
                this.handleCancel();
                break;
            case 'Save':
                this.handleSave(false);
                break;
            case 'Save & New':
                this.handleSave(true);
                break;
        }
    }

    handleCancel() {
        this.isModalOpen = false;
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    validateFields() {
        const requiredFields = [
            this.accountRecord.Name,
            this.accountRecord.Website,
            this.accountRecord.Type,
            this.accountRecord.MGR_Country__c,
            this.accountRecord.Related_Parties_Transactions__c,
            this.selectedIndustry,
            this.selectedSubIndustry
        ];
    
        return requiredFields.every(field => field && field.trim() !== '');
    }

    handleSave(createNew) {
        // Validación visual (DOM)
        const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox');
        let allValid = true;

        inputs.forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();
                allValid = false;
            }
        });

        if (!allValid) {
            this.showToast('Incomplete fields', 'Please fill all field before save', 'error');
            return;
        }

        const fields = {
            Name: this.accountRecord.Name,
            Website: this.accountRecord.Website,
            Type: this.accountRecord.Type,
            MGR_Country__c: this.accountRecord.MGR_Country__c,
            Related_Parties_Transactions__c: this.accountRecord.Related_Parties_Transactions__c,
            G4G_Industry__c: this.selectedIndustry,
            G4G_Subindustry__c: this.selectedSubIndustry
        };

        const recordInput = { apiName: 'Account', fields };

        createRecord(recordInput)
            .then(result => {
                this.showToast('', `Account "${this.accountRecord.Name}" was created`, 'success');

                if (createNew) {
                    this.resetForm();
                } else {
                    this.dispatchEvent(new CustomEvent('saved', {
                        detail: { recordId: result.id }
                    }));
                }
            })
            .catch(error => {
                let message = 'Account could not be created';
            
                // 1. Errores generales
                if (error?.body?.output?.errors?.length > 0) {
                    const messages = error.body.output.errors.map(err => err.message);
            
                    // Verificamos si es un posible duplicado
                    if (messages.includes('Use one of these records?')) {
                        message = 'An account with a similar name already exists. Please check for duplicates.';
                    } else {
                        message = messages.join(', ');
                    }
            
                // 2. Errores por campo específico
                } else if (error?.body?.output?.fieldErrors) {
                    const fieldErrors = error.body.output.fieldErrors;
                    const messages = Object.keys(fieldErrors).flatMap(field =>
                        fieldErrors[field].map(err => err.message)
                    );
                    message = messages.join(', ');
            
                // 3. Fallback
                } else if (error?.body?.message) {
                    message = error.body.message;
                }
            
                this.showToast('Error', message, 'error');
                console.error('Error on create account', JSON.stringify(error));
            });
    }

    resetForm() {
        this.accountRecord = {
            Name: '',
            Website: '',
            Type: '',
            MGR_Country__c: '',
            Related_Parties_Transactions__c: '',
            selectedIndustry: '',
            selectedSubIndustry: ''
        };

        const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox');
        inputs.forEach(input => {
            if (input.name !== 'owner') {
                input.value = null;
            }
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}