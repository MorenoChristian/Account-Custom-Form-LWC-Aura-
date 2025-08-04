({
    navigateToListView: function(component) {
        const navService = component.find("navService");
        if (navService) {
            navService.navigate({
                type: "standard_objectPage",
                attributes: {
                    objectApiName: "Account",
                    actionName: "list"
                },
                state: {
                    filterName: "Recent"
                }
            });
        }
    },

    navigationToRecordPage: function(component, recordId){
        const navService = component.find("navServices");
        if (navService) {
            navService.navigate({
                type: "standard__recordPage",
                attributes: {
                    recordId: recordId,
                    objectApiName: "Account",
                    actionName: "view"
                }
            })
        }
    }
})