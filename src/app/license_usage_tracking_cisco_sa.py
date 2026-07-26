import mysql.connector
from mysql.connector import errorcode
import sys
import time
import os
import subprocess
from datetime import datetime, timedelta

# Estabelecer conexão com o banco de dados MariaDB
con = mysql.connector.connect(
    host="127.0.0.1",
    user="pegasus",
    password="Pegasus@2024",
    database="pegasus"
)
cursor = con.cursor()

# Função para verificar a hora atual e interromper o loop se for igual ou maior a 8h
def check_time():
    current_time = datetime.now()
    if current_time.weekday() < 5:  # verifica se é segunda a sexta (0 a 4)
        if not (current_time.hour >= 8 and current_time.hour < 18):
            return True  # Retorna True se for igual ou maior que 8h
    else:   # Para sábado (5) e domingo (6)
        return False

# Executar a query para selecionar todas as colunas da tabela tbContractNTT
query = "SELECT mcsa_id, mcsa_client_id, mcsa_domain, mcsa_virtual_account, mcsa_license, mcsa_quantity, mcsa_start_date, mcsa_end_date, mcsa_license_type FROM tbMeasureCiscoSA WHERE ((mcsa_row_type = 'quantity') AND (mcsa_track IS NULL OR mcsa_track = 0)) LIMIT 5000;"
cursor.execute(query)

# Recuperar todos os resultados para evitar o erro "Unread result found"
results = cursor.fetchall()

# Obter o total de linhas que serão lidas
t = len(results)
c = 0
time_start = datetime.now()

# Obter a data atual
date_hour_now = datetime.now()
date_hour_string = date_hour_now.strftime('%Y-%m-%d %H:%M:%S')

# Formatar a data atual como uma string no formato "yyyy-mm-dd"
date_today_str = date_hour_now.strftime('%Y-%m-%d')
date_today = datetime.strptime(date_today_str, '%Y-%m-%d')

start_date = None
end_date = None
str_field = None
str_value = None
quantity_total = None
progress = ""
time_end_str = None

# Executar ajuste na tbContractNTTItem
for row in results:

    # Verifica a hora atual
    
    c = c + 1
    print_log = False
      
    #print_log = True
    #if c == 2:
    #    break
        
    x = (datetime.now() - time_start).total_seconds()
    y = (x * t) // c
    time_end = time_start + timedelta(seconds=y)
    time_end_str = time_end.strftime("%d-%m-%Y %H:%M:%S")
    progress = round((c / t) * 100, 3)
    
    if check_time():
        #Hora atual é igual ou maior que 8h. Interrompendo o script.
        log = f"{date_hour_string}: License Usage Tracking Cisco SA: {c} of {t}   [{progress}%] ... Interrupted - scheduled time"
     
        # Comando a ser executado
        comando = f'sed -i "/License Usage Tracking Cisco SA/d" /home/bridgeadoption/cron/ba_cron.log'
        saida = subprocess.check_output(comando, shell=True)

        comando = f'echo "{log}" >> /home/bridgeadoption/cron/ba_cron.log'
        saida = subprocess.check_output(comando, shell=True)
        
        break
    
    #if c == 1 or c % 10 == 0:
    # LOG
    log = f"{date_hour_string}: License Usage Tracking Cisco SA: {c} of {t}   [{progress}%] ... Estimated to complete: {time_end_str}"
     
    # Comando a ser executado
    comando = f'sed -i "/License Usage Tracking Cisco SA/d" /home/bridgeadoption/cron/ba_cron.log'
    saida = subprocess.check_output(comando, shell=True)
        
    comando = f'echo "{log}" >> /home/bridgeadoption/cron/ba_cron.log'
    saida = subprocess.check_output(comando, shell=True)
    
    
    if print_log:
        sys.stdout.write("\033[K")  # Limpa a linha anterior
        print(f'Progress: {c}/{t}  [{progress}%] ... Estimated to finish: {time_end}', end='\r')
        time.sleep(1)

    str_field = ""
    str_value = ""
    query = ""
    quantity_total = 0
    
    # coletando dados
    # mcsa_id = row[0]
    # mcsa_client_id = row[1]
    # mcsa_domain = row[2]
    # mcsa_virtual_account = row[3]
    # mcsa_license = row[4]
    # mcsa_quantity = row[5]
    # mcsa_start_date = row[6]
    # mcsa_end_date = row[7]
    # mcsa_license_type = row[8]
    
    id_source_table = row[0]    # mcsa_id
    client_id = row[1]          # mcsa_client_id
    vendor_id = 1
    license_type = "Smart Account"
    license_name = row[4]       # mcsa_license
    
    start_date = None
    if row[6] is None:
        start_date = 0
    else:
        #date_str = row[6]    # mcsa_start_date
        #start_date = datetime.strptime(date_str, "%Y-%m-%d")
        start_date = row[6]
        
    end_date = None
    if row[7] is None:
        end_date = 0
    else:
        #date_str = row[7]    # mcsa.end_date
        #end_date = datetime.strptime(date_str, "%Y-%m-%d")
        end_date = row[7]
    
    str_type = row[8]
    if str_type:
        if "perpetual" in row[8].lower():
            start_date = 0
            end_date = 0
        
    if row[5] is None:  # mcsa_quantity
        quantity_total = 0
    else:
        quantity_total = row[5]
    
    if quantity_total == 0:
        query = f"UPDATE tbMeasureCiscoSA SET mcsa_track = -1 WHERE mcsa_id = {id_source_table}"
        cursor.execute(query)
        con.commit()
        continue
    
    if row[2] is None:         # mcsa_domain
        domain_name = "-"
    else:
        domain_name = row[2]
    
    if row[2] is None:    #mcsa_virtual_account
        virtual_account = "-"
    else:
        virtual_account = row[3]
    
    # verificando datas/quantidades das licenças
          
    if start_date == 0 and end_date == 0:
        count_days = 0  #perpetual
    else:
        #start_date = datetime.strptime(start_date, "%Y-%m-%d")
        #end_date = datetime.strptime(end_date, "%Y-%m-%d")
        count_days = (end_date - start_date).days
    
    if count_days == 0:
        #PERPETUAL
        
        str_field = "clut_id_in_source_table"
        str_field += ", clut_client_id"
        str_field += ", clut_vendor_id"
        str_field += ", clut_license_type"
        str_field += ", clut_license_name"
        str_field += ", clut_quantity"
        str_field += ", clut_domain"
        str_field += ", clut_virtual_account"
        str_field += ", clut_perpetual"
        str_field += ", clut_date"
        
        str_value = f"{id_source_table}"
        str_value += f", {client_id}"
        str_value += f", {vendor_id}"
        str_value += f", '{license_type}'"
        str_value += f", '{license_name}'"
        str_value += f", {quantity_total}"
        str_value += f", '{domain_name}'"
        str_value += f", '{virtual_account}'"
        str_value += ", -1"
               
        str_filter = f"clut_id_in_source_table = {id_source_table}"
        str_filter += f" AND clut_client_id = {client_id}"
        str_filter += f" AND clut_vendor_id = {vendor_id}"
        str_filter += f" AND clut_license_type = '{license_type}'"
        str_filter += f" AND clut_license_name = '{license_name}'"
        str_filter += f" AND clut_quantity = {quantity_total}"
        str_filter += f" AND clut_domain = '{domain_name}'"
        str_filter += f" AND clut_virtual_account = '{virtual_account}'"
        str_filter += f" AND clut_perpetual = -1"
        
        query = f"SELECT Max(mcsa_end_date) AS max_mcsa_end_date FROM tbMeasureCiscoSA WHERE mcsa_client_id = {client_id} AND mcsa_license = '{license_name}' AND mcsa_domain = '{domain_name}' AND mcsa_virtual_account = '{virtual_account}'"
        cursor.execute(query)
        result = cursor.fetchone()[0]
        if result is None:
            max_date = datetime.strptime(date_today_str, '%Y-%m-%d')
        else:
            result = str(result)
            max_date = datetime.strptime(result, '%Y-%m-%d')
        
        #query = f"SELECT COUNT(clut_id) FROM tbClientLicenseUsageTracking WHERE {str_filter} AND clut_date >= '{date_today}';"
        #cursor.execute(query)
        #check = cursor.fetchone()[0]
        #if check > 0:
        #    query = f"UPDATE tbClientLicenseUsageTracking SET clut_quantity = 0 WHERE clut_id_in_source_table = {id_source_table} AND clut_date >= '{date_today}';"
        #    cursor.execute(query)
        #    con.commit()           
        
        count_days_perpetual = (max_date - date_today).days
        
        if count_days_perpetual <= 1:
            str_value_date = f"{str_value}, '{date_today}'"
            str_filter_date = f"{str_filter} AND clut_date = '{date_today}'"
            
            query = f"SELECT COUNT(clut_id) FROM tbClientLicenseUsageTracking WHERE {str_filter_date};"
            cursor.execute(query)
            check = cursor.fetchone()[0]
            if check == 0:
                query = f"INSERT INTO tbClientLicenseUsageTracking ({str_field}) VALUES ({str_value_date});"
                cursor.execute(query)
                con.commit()
            #else:
            #    query = f"SELECT clut_id FROM tbClientLicenseUsageTracking WHERE {str_filter_date};"
            #    cursor.execute(query)
            #    clut_id = cursor.fetchone()[0]
            
            #    query = f"UPDATE tbClientLicenseUsageTracking SET clut_quantity = {quantity_total} WHERE clut_id = {clut_id};"
            #    cursor.execute(query)
            #    con.commit()
        else:
            for i in range(count_days_perpetual + 1):
                #step2: make the tracking (update or insert)
                current_date = date_today + timedelta(days=i)
                str_date = current_date.strftime("%Y-%m-%d")
                str_value_date = f"{str_value}, '{str_date}'"
                str_filter_date = f"{str_filter} AND clut_date = '{str_date}'"
            
                query = f"SELECT COUNT(clut_id) FROM tbClientLicenseUsageTracking WHERE {str_filter_date};"
                cursor.execute(query)
                check = cursor.fetchone()[0]
                if check == 0:
                    query = f"INSERT INTO tbClientLicenseUsageTracking ({str_field}) VALUES ({str_value_date});"
                    cursor.execute(query)
                    con.commit()
                #else:
                #    query = f"SELECT clut_id FROM tbClientLicenseUsageTracking WHERE {str_filter_date};"
                #    cursor.execute(query)
                #    clut_id = cursor.fetchone()[0]
                    
                #    query = f"UPDATE tbClientLicenseUsageTracking SET clut_quantity = {quantity_total} WHERE clut_id = {clut_id};"
                #    cursor.execute(query)
                #    con.commit()

                if print_log:
                    sys.stdout.write("\033[K")  # Limpa a linha anterior
                    print(f'{c}/{t}: id {id_source_table} => Tracking: {i}/{count_days_perpetual}', end='\r')
                    time.sleep(1)

    elif count_days == 1:
        str_date = start_date
        
        str_field = "clut_id_in_source_table"
        str_field += ", clut_client_id"
        str_field += ", clut_vendor_id"
        str_field += ", clut_license_type"
        str_field += ", clut_license_name"
        str_field += ", clut_quantity"
        str_field += ", clut_domain"
        str_field += ", clut_virtual_account"
        str_field += ", clut_date"       
        
        str_value = f"{id_source_table}"
        str_value += f", {client_id}"
        str_value += f", {vendor_id}"
        str_value += f", '{license_type}'"
        str_value += f", '{license_name}'"
        str_value += f", {quantity_total}"
        str_value += f", '{domain_name}'"
        str_value += f", '{virtual_account}'"
        str_value += f", '{str_date}'"
        
        str_filter = f"clut_id_in_source_table = {id_source_table}"
        str_filter += f" AND clut_client_id = {client_id}"
        str_filter += f" AND clut_vendor_id = {vendor_id}"
        str_filter += f" AND clut_license_type = '{license_type}'"
        str_filter += f" AND clut_license_name = '{license_name}'"
        str_filter += f" AND clut_quantity = {quantity_total}"
        str_filter += f" AND clut_domain = '{domain_name}'"
        str_filter += f" AND clut_virtual_account = '{virtual_account}'"
        str_filter += f" AND clut_date = '{str_date}'"
        str_filter += " AND clut_perpetual = 0"
        
        query = f"SELECT COUNT(clut_id) FROM tbClientLicenseUsageTracking WHERE {str_filter};"
        cursor.execute(query)
        check = cursor.fetchone()[0]

        if check == 0:
            query = f"INSERT INTO tbClientLicenseUsageTracking ({str_field}) VALUES ({str_value});"
            cursor.execute(query)
            con.commit()
        else:
            query = f"SELECT clut_id FROM tbClientLicenseUsageTracking WHERE {str_filter};"
            cursor.execute(query)
            clut_id = cursor.fetchone()[0]
            
            query = f"UPDATE tbClientLicenseUsageTracking SET clut_quantity = {quantity_total} WHERE clut_id = {clut_id};"
            cursor.execute(query)
            con.commit()

        query = f"UPDATE tbMeasureCiscoSA SET mcsa_track = -1 WHERE mcsa_id = {id_source_table}"
        cursor.execute(query)
        con.commit()
        
    else:
        str_field = "clut_id_in_source_table"
        str_field += ", clut_client_id"
        str_field += ", clut_vendor_id"
        str_field += ", clut_license_type"
        str_field += ", clut_license_name"
        str_field += ", clut_quantity"
        str_field += ", clut_domain"
        str_field += ", clut_virtual_account"
        str_field += ", clut_date"       
        
        str_value = f"{id_source_table}"
        str_value += f", {client_id}"
        str_value += f", {vendor_id}"
        str_value += f", '{license_type}'"
        str_value += f", '{license_name}'"
        str_value += f", {quantity_total}"
        str_value += f", '{domain_name}'"
        str_value += f", '{virtual_account}'"
        
        str_filter = f"clut_id_in_source_table = {id_source_table}"
        str_filter += f" AND clut_client_id = {client_id}"
        str_filter += f" AND clut_vendor_id = {vendor_id}"
        str_filter += f" AND clut_license_type = '{license_type}'"
        str_filter += f" AND clut_license_name = '{license_name}'"
        str_filter += f" AND clut_domain = '{domain_name}'"
        str_filter += f" AND clut_virtual_account = '{virtual_account}'"
        str_filter += " AND clut_perpetual = 0"

        #step1: change to zero(0) all records quantity field - maybe is a changing
 
        query = f"SELECT COUNT(clut_id) FROM tbClientLicenseUsageTracking WHERE {str_filter};"
        cursor.execute(query)
        check = cursor.fetchone()[0]
        if check > 0:
            query = f"UPDATE tbClientLicenseUsageTracking SET clut_quantity = 0 WHERE clut_id_in_source_table = {id_source_table}"
            cursor.execute(query)
            con.commit()           
            
        for i in range(count_days + 1):
            #step2: make the tracking (update or insert)
            current_date = start_date + timedelta(days=i)
            str_date = current_date.strftime("%Y-%m-%d")
            str_value_date = f"{str_value}, '{str_date}'"
            str_filter_date = f"{str_filter} AND clut_date = '{str_date}'"
            
            query = f"SELECT COUNT(clut_id) FROM tbClientLicenseUsageTracking WHERE {str_filter_date};"
            cursor.execute(query)
            check = cursor.fetchone()[0]
            
            if check == 0:
                query = f"INSERT INTO tbClientLicenseUsageTracking ({str_field}) VALUES ({str_value_date});"
                cursor.execute(query)
                con.commit()
            else:
                query = f"SELECT clut_id FROM tbClientLicenseUsageTracking WHERE {str_filter_date};"
                cursor.execute(query)
                clut_id = cursor.fetchone()[0]
                
                query = f"UPDATE tbClientLicenseUsageTracking SET clut_quantity = {quantity_total} WHERE clut_id = {clut_id};"
                cursor.execute(query)
                con.commit()
            
            if print_log:
                sys.stdout.write("\033[K")  # Limpa a linha anterior
                print(f'{c}/{t}: id {id_source_table} => Tracking: {i}/{count_days}', end='\r')
                time.sleep(1)
            
        query = f"UPDATE tbMeasureCiscoSA SET mcsa_track = -1 WHERE mcsa_id = {id_source_table}"
        cursor.execute(query)
        con.commit()

cursor.close()
con.close()

# LOG
log = f"{date_hour_string}: License Usage Tracking Cisco SA: {c} of {t}   [{progress}%] ... Estimated to complete: {time_end_str}"
 
# Comando a ser executado
comando = f'sed -i "/License Usage Tracking Cisco SA/d" /home/bridgeadoption/cron/ba_cron.log'
saida = subprocess.check_output(comando, shell=True)
    
comando = f'echo "{log}" >> /home/bridgeadoption/cron/ba_cron.log'
saida = subprocess.check_output(comando, shell=True)
