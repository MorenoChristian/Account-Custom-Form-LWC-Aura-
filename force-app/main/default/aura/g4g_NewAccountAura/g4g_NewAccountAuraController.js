({
    handleCancel: function(component, events, helper) {
        const workspaceAPI = component.find("workspace");
        if(workspaceAPI && workspaceAPI.getFocusedTabInfo) {
            workspaceAPI.getFocusedTabInfo()
            .then(function(response) {
                const tabId = response.tabId;
                return workspaceAPI.closeTab({ tabId: tabId});
            })
            .catch(function(error) {
                console.warn("No se pudo cerrar el tab (no console). Navegando a lista.");
                helper.navigateToListView(component);
            });
        } else {
            helper.navigateToListView(component);
        }
    },

    handleSaveSucess: function(component, event, helper) {
        const recordId = event.getParam('recordId');
        const workspaceAPI = component.find("workspace");

        if(workspaceAPI && workspaceAPI.openTab) {
            // Primero cerramos el tab actual (New Account)
            workspaceAPI.getFocusedTabInfo()
            .then(function() {
                // Abrimos el tab con la cuenta recien creada
                return workspaceAPI.openTab({
                    url: '/lightning/r/Account/' + recordId + '/view',
                    focus: false
                });
            })
            .then(function(response) {
                const tabId = response.tabId;
                return workspaceAPI.closeTab({ tabId: tabId});
            })
            .catch(function(error) {
                console.error("Error manejando tabs en Console:", error);
                // Fallback: navegamos con NavigationMixin
                helper.navigateToRecordPage(component, recordId);
            });
        } else {
            // No estamos en Console, navegamos normalmente
            helper.navigateToRecordPage(component, recordId);
        }
    }
})