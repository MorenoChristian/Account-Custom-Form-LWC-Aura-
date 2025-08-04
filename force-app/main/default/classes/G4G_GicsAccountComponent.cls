public with sharing class G4G_GicsAccountComponent {
    @AuraEnabled
    public static List<G4G_Gics__c> getIndustries(){
        return [SELECT Id, Name, G4G_IndustryFX__c FROM G4G_Gics__c WHERE RecordType.DeveloperName = 'G4G_Industry' AND G4G_Active__c = true ORDER BY Name];
    }

    @AuraEnabled
    public static List<G4G_Gics__c> getSubIndustries(String industryId){
        return [SELECT Id, Name, G4G_Parent__c FROM G4G_Gics__c WHERE RecordType.DeveloperName = 'G4G_SubIndustry' AND G4G_Parent__c = :industryId AND G4G_Active__c = true ORDER BY Name];
    }
}