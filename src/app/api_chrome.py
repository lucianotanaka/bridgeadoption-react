import requests

url = "https://fluig.am-workflow.nttltd.global.ntt/webdesk/ECMDatasetService?wsdl"

headers = {
    "Content-Type": "text/xml;charset=UTF-8",
    "SOAPAction": ""
}

soap_body = """<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ws="http://ws.dataservice.ecm.technology.totvs.com/">
    <soapenv:Header/>
    <soapenv:Body>
        <ws:getDataset>
            <companyId>1</companyId>
            <username>luciano.tanaka@global.ntt</username>
            <password>Jesus#1Deus</password>
            <name>ds_api_chronos</name>
            <fields></fields>
            <constraints></constraints>
            <order></order>
        </ws:getDataset>
    </soapenv:Body>
</soapenv:Envelope>
"""
 
#// Obtemos só o binário da resposta
#RawResponse = Table.FromColumns({Lines.FromBinary(Web.Contents(url, [Headers=[#"Content-Type"="application/xml", Accept="*/*"], Content=Text.ToBinary(soap_body)]), null, null, 65001)}),

response = requests.post(url, data=soap_body, headers=headers)

#print(response.status_code)
#print(response.text)


# Simulando RawResponse como no Power Query
raw_response_lines = response.text.splitlines()
raw_response_table = [[line] for line in raw_response_lines]

# Exibir como tabela simples
for row in raw_response_table:
    print(row[0])



