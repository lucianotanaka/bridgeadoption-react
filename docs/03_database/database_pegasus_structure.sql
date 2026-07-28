/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.5.29-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: pegasus
-- ------------------------------------------------------
-- Server version	10.5.29-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `tbAccountTeam`
--

DROP TABLE IF EXISTS `tbAccountTeam`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAccountTeam` (
  `accountteam_id` int(11) NOT NULL AUTO_INCREMENT,
  `accountteam_company_id` int(11) DEFAULT NULL COMMENT 'tbCompany.company_id',
  `accountteam_user_id` int(11) DEFAULT NULL,
  `accountteam_user_type` varchar(15) DEFAULT NULL,
  `accountteam_allocation_start_date` date DEFAULT curdate(),
  `accountteam_allocation_end_date` date DEFAULT NULL,
  `accountteam_allocated` tinyint(1) DEFAULT -1,
  `accountteam_changed_in` date DEFAULT NULL,
  `accountteam_changed_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`accountteam_id`),
  KEY `idx_tbAccountTeam_company_type_alloc_user_dates` (`accountteam_company_id`,`accountteam_user_type`,`accountteam_allocated`,`accountteam_user_id`,`accountteam_allocation_start_date`,`accountteam_allocation_end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2282 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAccountTeamNote`
--

DROP TABLE IF EXISTS `tbAccountTeamNote`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAccountTeamNote` (
  `accounteamnote_id` int(11) NOT NULL AUTO_INCREMENT,
  `accounteamnote_company_id` int(11) NOT NULL DEFAULT 0,
  `accounteamnote_noted_by` varchar(150) NOT NULL,
  `accounteamnote_type` varchar(150) NOT NULL DEFAULT '-',
  `accounteamnote_date` date NOT NULL,
  `accounteamnote_unhide_until` date DEFAULT NULL,
  `accounteamnote_note` text NOT NULL,
  PRIMARY KEY (`accounteamnote_id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAllocationType`
--

DROP TABLE IF EXISTS `tbAllocationType`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAllocationType` (
  `allocationtype_id` int(11) NOT NULL AUTO_INCREMENT,
  `allocationtype_description` varchar(25) DEFAULT NULL,
  `allocationtype_hours` int(11) DEFAULT NULL,
  PRIMARY KEY (`allocationtype_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAsset`
--

DROP TABLE IF EXISTS `tbAsset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAsset` (
  `asset_id` int(11) NOT NULL AUTO_INCREMENT,
  `asset_customer_id` int(11) NOT NULL DEFAULT 0,
  `asset_product_id` int(11) DEFAULT 0,
  `asset_ponumber` varchar(50) DEFAULT NULL,
  `asset_sonumber` varchar(50) DEFAULT NULL,
  `asset_type` varchar(100) DEFAULT NULL,
  `asset_subscription_id` varchar(100) DEFAULT NULL,
  `asset_serial_number` varchar(80) DEFAULT NULL,
  `asset_parent_serial_number` varchar(80) DEFAULT NULL,
  `asset_instance_number` varchar(50) DEFAULT NULL,
  `asset_parent_instance_number` varchar(50) DEFAULT NULL,
  `asset_parent_level` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `asset_sales_order` varchar(150) DEFAULT NULL,
  `asset_web_order_id` varchar(150) DEFAULT NULL,
  `asset_deal_id` varchar(100) DEFAULT NULL,
  `asset_price` decimal(10,6) DEFAULT NULL,
  `asset_rfid` varchar(50) DEFAULT NULL,
  `asset_ov` varchar(10) DEFAULT NULL,
  `asset_warehouse` varchar(100) DEFAULT NULL,
  `asset_created_at` date DEFAULT curdate(),
  PRIMARY KEY (`asset_id`),
  UNIQUE KEY `tbAsset_asset_product_id_IDX` (`asset_product_id`,`asset_serial_number`,`asset_instance_number`) USING BTREE,
  UNIQUE KEY `tbAsset_asset_customer_id_IDX` (`asset_customer_id`,`asset_product_id`,`asset_serial_number`,`asset_parent_serial_number`,`asset_instance_number`,`asset_parent_instance_number`,`asset_parent_level`) USING BTREE,
  KEY `idx_asset_pspi` (`asset_product_id`,`asset_serial_number`,`asset_instance_number`),
  KEY `idx_asset_ps` (`asset_product_id`,`asset_serial_number`),
  KEY `idx_asset_pi` (`asset_product_id`,`asset_instance_number`),
  KEY `idx_asset_product` (`asset_product_id`),
  KEY `idx_tbAsset_product` (`asset_id`,`asset_product_id`),
  KEY `idx_asset_serial` (`asset_serial_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2153126 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAssetContractEndMismatch`
--

DROP TABLE IF EXISTS `tbAssetContractEndMismatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAssetContractEndMismatch` (
  `asset_id` int(11) NOT NULL,
  `asset_serial_number` varchar(80) DEFAULT NULL,
  `asset_instance_number` varchar(50) DEFAULT NULL,
  `asset_subscription_id` varchar(100) DEFAULT NULL,
  `asset_parent_level` varchar(20) DEFAULT NULL,
  `asset_parent_serial_number` varchar(80) DEFAULT NULL,
  `asset_parent_instance_number` varchar(50) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name` varchar(150) DEFAULT NULL,
  `product_manufacturer_id` int(11) DEFAULT NULL,
  `product_manufacturer_name` varchar(255) DEFAULT NULL,
  `product_family` varchar(100) DEFAULT NULL,
  `product_group` varchar(100) DEFAULT NULL,
  `product_subtype` varchar(100) DEFAULT NULL,
  `vendorasset_contract_num` varchar(50) DEFAULT NULL,
  `vendorasset_customer_id` int(11) DEFAULT NULL,
  `vendorasset_customer_name` varchar(255) DEFAULT NULL,
  `nttasset_contract_number` varchar(12) DEFAULT NULL,
  `nttasset_entitlement_id` int(11) DEFAULT NULL,
  `nttasset_entitlement_contract` varchar(255) DEFAULT NULL,
  `nttasset_customer_id` int(11) DEFAULT NULL,
  `nttasset_customer_name` varchar(255) DEFAULT NULL,
  `vendorasset_vendor_id` int(11) DEFAULT NULL,
  `vendorasset_vendor_name` varchar(255) DEFAULT NULL,
  `vendorasset_start` date DEFAULT NULL,
  `vendorasset_end` date DEFAULT NULL,
  `nttasset_contract_start` date DEFAULT NULL,
  `nttasset_contract_end` date DEFAULT NULL,
  `end_date_diff_days` int(11) DEFAULT NULL,
  `start_date_diff_days` int(11) DEFAULT NULL,
  `customer_mismatch_flag` tinyint(4) DEFAULT NULL,
  `status_consolidated` varchar(10) DEFAULT NULL,
  `alert_reason` varchar(30) DEFAULT NULL,
  `product_eos` date DEFAULT NULL,
  `product_ldos` date DEFAULT NULL,
  `eos_status` varchar(30) DEFAULT NULL,
  `ldos_status` varchar(30) DEFAULT NULL,
  `refreshed_at` datetime NOT NULL,
  KEY `idx_customer_ntt` (`nttasset_customer_id`),
  KEY `idx_customer_vendor` (`vendorasset_customer_id`),
  KEY `idx_asset` (`asset_id`),
  KEY `idx_status` (`status_consolidated`),
  KEY `idx_alert` (`alert_reason`),
  KEY `idx_vendor_end` (`vendorasset_end`),
  KEY `idx_ntt_end` (`nttasset_contract_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAssetContractSummaryByCustomer`
--

DROP TABLE IF EXISTS `tbAssetContractSummaryByCustomer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAssetContractSummaryByCustomer` (
  `customer_id` int(11) NOT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `total_assets` int(11) NOT NULL,
  `vendor_end_only_count` int(11) NOT NULL,
  `vendor_end_only_percent` decimal(6,2) NOT NULL,
  `ntt_end_only_count` int(11) NOT NULL,
  `ntt_end_only_percent` decimal(6,2) NOT NULL,
  `both_end_count` int(11) NOT NULL,
  `both_end_percent` decimal(6,2) NOT NULL,
  `refreshed_at` datetime NOT NULL,
  PRIMARY KEY (`customer_id`),
  KEY `idx_company_name` (`customer_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAssetDeployment`
--

DROP TABLE IF EXISTS `tbAssetDeployment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAssetDeployment` (
  `deployment_id` int(11) NOT NULL AUTO_INCREMENT,
  `deployment_company_id` int(11) NOT NULL,
  `deployment_site_id` int(11) NOT NULL,
  `deployment_asset_id` int(11) NOT NULL,
  `environment` varchar(30) DEFAULT NULL,
  `hostname` varchar(120) DEFAULT NULL,
  `mgmt_ip` varchar(45) DEFAULT NULL,
  `vip_ip` varchar(45) DEFAULT NULL,
  `is_shared_mgmt_ip` tinyint(1) NOT NULL DEFAULT 0,
  `is_shared_vip_ip` tinyint(1) NOT NULL DEFAULT 0,
  `deployment_group_type` varchar(20) DEFAULT NULL,
  `deployment_group_key` varchar(80) DEFAULT NULL,
  `deployment_role` varchar(20) DEFAULT NULL,
  `parent_asset_id` int(11) DEFAULT NULL,
  `member_index` int(11) DEFAULT NULL,
  `slot` varchar(20) DEFAULT NULL,
  `port` varchar(20) DEFAULT NULL,
  `deployment_status` varchar(20) NOT NULL DEFAULT 'INSTALLED',
  `installed_at` datetime DEFAULT NULL,
  `in_production_at` datetime DEFAULT NULL,
  `retired_at` datetime DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`deployment_id`),
  KEY `idx_deploy_company_site` (`deployment_company_id`,`deployment_site_id`),
  KEY `idx_deploy_asset` (`deployment_asset_id`),
  KEY `idx_deploy_company_site_asset` (`deployment_company_id`,`deployment_site_id`,`deployment_asset_id`),
  KEY `idx_deploy_active_status` (`is_active`,`deployment_status`,`updated_at`),
  KEY `idx_deploy_group` (`deployment_company_id`,`deployment_site_id`,`deployment_group_type`,`deployment_group_key`),
  KEY `idx_deploy_group_key` (`deployment_group_key`),
  KEY `idx_deploy_mgmt_ip` (`mgmt_ip`),
  KEY `idx_deploy_vip_ip` (`vip_ip`),
  KEY `idx_deploy_parent_asset` (`parent_asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAssetTracking`
--

DROP TABLE IF EXISTS `tbAssetTracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAssetTracking` (
  `tracking_id` int(11) NOT NULL AUTO_INCREMENT,
  `tracking_company_id` int(11) NOT NULL,
  `tracking_site_id` int(11) NOT NULL,
  `tracking_asset_id` int(11) NOT NULL,
  `tracking_operation` varchar(10) DEFAULT 'DELIVERED' COMMENT 'DELIVERED: entregue ao site; INSTALLED: fisicamente instalado; IN_SERVICE: ativo em produção; MOVED: mudança de site/local; MAINTENANCE: em manutenção; SUSPENDED: temporariamente fora de uso; RETIRED: retirado de operação; DISPOSED: descartado',
  `tracking_operation_by` varchar(100) DEFAULT 'NTT',
  `tracking_operation_date` date DEFAULT NULL,
  `tracking_ov` varchar(10) DEFAULT NULL,
  `tracking_nf` varchar(10) DEFAULT NULL,
  `tracking_remark` text DEFAULT NULL,
  PRIMARY KEY (`tracking_id`),
  KEY `tbAssetTracking_assettracking_company_id_IDX` (`tracking_company_id`,`tracking_site_id`,`tracking_asset_id`,`tracking_operation`,`tracking_operation_by`,`tracking_operation_date`) USING BTREE,
  KEY `idx_tracking_asset_id_tracking_id` (`tracking_asset_id`,`tracking_id`),
  KEY `idx_tracking_op_date_asset` (`tracking_operation`,`tracking_operation_date`,`tracking_asset_id`,`tracking_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18130 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAuthAction`
--

DROP TABLE IF EXISTS `tbAuthAction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAuthAction` (
  `action_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único da ação.',
  `action_key` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'Identificador técnico da ação (ex: view, create, edit, delete).',
  `action_name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'Nome amigável da ação para exibição administrativa.',
  `action_description` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT 'Descrição detalhada da ação.',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Define se a ação está ativa no sistema.',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data de criação da ação.',
  PRIMARY KEY (`action_id`),
  UNIQUE KEY `action_key` (`action_key`),
  UNIQUE KEY `uq_action_key` (`action_key`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tabela de ações possíveis sobre recursos no módulo de autorização.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAuthPermission`
--

DROP TABLE IF EXISTS `tbAuthPermission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAuthPermission` (
  `permission_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único da permissão.',
  `user_role_id` int(11) NOT NULL COMMENT 'FK para tbAuthUserRole.user_role_id (vínculo usuário-role).',
  `resource_id` int(11) NOT NULL COMMENT 'Chave estrangeira para tbAuthResource.',
  `action_id` int(11) NOT NULL COMMENT 'Chave estrangeira para tbAuthAction.',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data de criação da permissão.',
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uq_auth_permission` (`user_role_id`,`resource_id`,`action_id`) COMMENT 'Impede duplicidade de permissão para a mesma combinação role + resource + action.',
  KEY `fk_auth_permission_resource` (`resource_id`),
  KEY `fk_auth_permission_action` (`action_id`),
  CONSTRAINT `fk_auth_permission_action` FOREIGN KEY (`action_id`) REFERENCES `tbAuthAction` (`action_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auth_permission_resource` FOREIGN KEY (`resource_id`) REFERENCES `tbAuthResource` (`resource_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auth_permission_userrole` FOREIGN KEY (`user_role_id`) REFERENCES `tbAuthUserRole` (`user_role_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=135 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tabela de permissões granulares do módulo de autorização.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAuthResource`
--

DROP TABLE IF EXISTS `tbAuthResource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAuthResource` (
  `resource_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único do recurso protegido.',
  `resource_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Identificador técnico do recurso usado no código (ex: adoption.task, admin.importer). Deve ser único e estável.',
  `resource_name` varchar(100) DEFAULT NULL COMMENT 'Nome amigável do recurso para exibição administrativa.',
  `resource_icon` varchar(50) DEFAULT NULL COMMENT 'Ícone do recurso para uso na interface',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Define se o recurso está ativo no sistema.',
  `show_in_menu` tinyint(1) DEFAULT 0 COMMENT 'Define se o recurso deve ser exibido como item do menu de navegação.',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data de criação do recurso.',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Data da última atualização.',
  PRIMARY KEY (`resource_id`),
  UNIQUE KEY `resource_key` (`resource_key`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci COMMENT='Tabela de recursos protegidos pelo módulo de autorização.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAuthRole`
--

DROP TABLE IF EXISTS `tbAuthRole`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAuthRole` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único da role (chave primária).',
  `role_name` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT 'Nome amigável da role para exibição em interfaces administrativas.',
  `role_description` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT 'Descrição detalhada da finalidade da role.',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Define se a role está ativa para uso no sistema.',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data de criação do registro.',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Data da última atualização do registro.',
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `tbAuthRole_role_name_IDX` (`role_name`) USING BTREE,
  UNIQUE KEY `uq_role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tabela de papéis (roles) do módulo de autorização.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbAuthUserRole`
--

DROP TABLE IF EXISTS `tbAuthUserRole`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbAuthUserRole` (
  `user_role_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único do vínculo usuário-role.',
  `user_id` int(11) NOT NULL COMMENT 'Chave estrangeira para tbUser (usuário do sistema).',
  `role_id` int(11) NOT NULL COMMENT 'Chave estrangeira para tbAuthRole.',
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data em que a role foi atribuída ao usuário.',
  PRIMARY KEY (`user_role_id`),
  UNIQUE KEY `uq_auth_user_role` (`user_id`,`role_id`) COMMENT 'Impede duplicidade de atribuição da mesma role ao mesmo usuário.',
  KEY `fk_auth_userrole_role` (`role_id`),
  CONSTRAINT `fk_auth_userrole_role` FOREIGN KEY (`role_id`) REFERENCES `tbAuthRole` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auth_userrole_user` FOREIGN KEY (`user_id`) REFERENCES `tbUser` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci COMMENT='Tabela de relacionamento entre usuários e roles no módulo de autorização.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbBaselineCiscoEA`
--

DROP TABLE IF EXISTS `tbBaselineCiscoEA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbBaselineCiscoEA` (
  `baseline_ea_id` int(11) NOT NULL AUTO_INCREMENT,
  `baseline_ea_num` int(11) NOT NULL DEFAULT 0,
  `baseline_ea_update_date` date DEFAULT NULL,
  `baseline_ea_customer_id` int(11) DEFAULT 0,
  `baseline_ea_customer` varchar(255) DEFAULT '-',
  `baseline_ea_domain` varchar(100) DEFAULT '-',
  `baseline_ea_virtual_account` varchar(150) DEFAULT '-',
  `baseline_ea_subscription_id` varchar(50) DEFAULT '-',
  `baseline_ea_ntf_date` date DEFAULT NULL,
  `baseline_ea_status` varchar(50) DEFAULT '-',
  `baseline_ea_start_date` date DEFAULT NULL,
  `baseline_ea_end_date` date DEFAULT NULL,
  `baseline_ea_suite_name` varchar(255) DEFAULT '-',
  `baseline_ea_calculation_methon` varchar(50) DEFAULT '-',
  `baseline_ea_product_id` int(11) DEFAULT 0,
  `baseline_ea_sku` varchar(100) DEFAULT '-',
  `baseline_ea_purchased` double DEFAULT 0,
  `baseline_ea_growth_allwance` double DEFAULT 0,
  `baseline_ea_generated` double DEFAULT 0,
  `baseline_ea_balance` double DEFAULT 0,
  `baseline_ea_pre_ea` double DEFAULT 0,
  `baseline_ea_license_migrated` double DEFAULT 0,
  PRIMARY KEY (`baseline_ea_id`),
  KEY `tbBaselineCiscoEA_baseline_ea_num_IDX` (`baseline_ea_num`,`baseline_ea_customer_id`,`baseline_ea_domain`,`baseline_ea_virtual_account`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbBaselineCiscoEAControl`
--

DROP TABLE IF EXISTS `tbBaselineCiscoEAControl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbBaselineCiscoEAControl` (
  `baseline_ea_id` int(11) DEFAULT NULL,
  `baseline_ea_update_date` datetime DEFAULT NULL,
  `baseline_ea_customer_id` int(11) DEFAULT NULL,
  `baseline_ea_customer` varchar(255) DEFAULT NULL,
  `baseline_ea_domain` varchar(100) DEFAULT NULL,
  `baseline_ea_virtual_account` varchar(150) DEFAULT NULL,
  `baseline_ea_subscription_id` varchar(50) DEFAULT NULL,
  `baseline_ea_ntf_date` datetime DEFAULT NULL,
  `baseline_ea_status` varchar(50) DEFAULT NULL,
  `baseline_ea_start_date` datetime DEFAULT NULL,
  `baseline_ea_end_date` datetime DEFAULT NULL,
  `baseline_ea_suite_name` varchar(255) DEFAULT NULL,
  `baseline_ea_calculation_methon` varchar(50) DEFAULT NULL,
  `baseline_ea_product_id` varchar(255) DEFAULT NULL,
  `baseline_ea_sku` varchar(100) DEFAULT NULL,
  `baseline_ea_purchased` decimal(18,0) DEFAULT NULL,
  `baseline_ea_growth_allwance` float(18,0) DEFAULT NULL,
  `baseline_ea_generated` float(18,0) DEFAULT NULL,
  `baseline_ea_balance` float(18,0) DEFAULT NULL,
  `baseline_ea_pre_ea` float(18,0) DEFAULT NULL,
  `baseline_ea_license_migrated` float(18,0) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbBaselineCiscoSA`
--

DROP TABLE IF EXISTS `tbBaselineCiscoSA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbBaselineCiscoSA` (
  `baseline_sa_id` int(11) NOT NULL AUTO_INCREMENT,
  `baseline_sa_num` int(11) NOT NULL DEFAULT 0,
  `baseline_sa_update_date` date DEFAULT NULL,
  `baseline_sa_customer_id` int(11) DEFAULT 0,
  `baseline_sa_customer_name` varchar(255) DEFAULT '-',
  `baseline_sa_domain` varchar(100) DEFAULT '-',
  `baseline_sa_product_id` int(11) DEFAULT 0,
  `baseline_sa_license` varchar(255) DEFAULT '-',
  `baseline_sa_virtual_account` varchar(150) DEFAULT '-',
  `baseline_sa_billing` varchar(50) DEFAULT '-',
  `baseline_sa_available_to_use` double DEFAULT 0,
  `baseline_sa_in_use` double DEFAULT 0,
  `baseline_sa_balance` double DEFAULT 0,
  `baseline_sa_compliance` varchar(50) DEFAULT '-',
  `baseline_sa_license_type` varchar(50) DEFAULT '-',
  `baseline_sa_quantity` decimal(18,0) DEFAULT 0,
  `baseline_sa_subscription_id` varchar(100) DEFAULT '-',
  `baseline_sa_days_to_end` double DEFAULT NULL,
  `baseline_sa_active` varchar(50) DEFAULT '-',
  `baseline_sa_start_date` date DEFAULT NULL,
  `baseline_sa_end_date` date DEFAULT NULL,
  PRIMARY KEY (`baseline_sa_id`),
  KEY `tbBaselineCiscoSmartAccount_baseline_sa_num_IDX` (`baseline_sa_num`,`baseline_sa_customer_id`,`baseline_sa_domain`,`baseline_sa_product_id`,`baseline_sa_virtual_account`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbBaselineCiscoSAControl`
--

DROP TABLE IF EXISTS `tbBaselineCiscoSAControl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbBaselineCiscoSAControl` (
  `baseline_sa_id` int(11) DEFAULT NULL,
  `baseline_sa_update_date` datetime DEFAULT NULL,
  `baseline_sa_customer_id` int(11) DEFAULT NULL,
  `baseline_sa_customer_name` varchar(255) DEFAULT NULL,
  `baseline_sa_domain` varchar(100) DEFAULT NULL,
  `baseline_sa_product_id` int(11) DEFAULT NULL,
  `baseline_sa_license` varchar(255) DEFAULT NULL,
  `baseline_sa_virtual_account` varchar(150) DEFAULT NULL,
  `baseline_sa_billing` varchar(50) DEFAULT NULL,
  `baseline_sa_available_to_use` double DEFAULT NULL,
  `baseline_sa_in_use` double DEFAULT NULL,
  `baseline_sa_balance` double DEFAULT NULL,
  `baseline_sa_compliance` varchar(50) DEFAULT NULL,
  `baseline_sa_license_type` varchar(50) DEFAULT NULL,
  `baseline_sa_quantity` double DEFAULT NULL,
  `baseline_sa_subscription_id` varchar(100) DEFAULT NULL,
  `baseline_sa_days_to_end` decimal(18,0) DEFAULT NULL,
  `baseline_sa_active` varchar(50) DEFAULT NULL,
  `baseline_sa_start_date` datetime DEFAULT NULL,
  `baseline_sa_end_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCalendar`
--

DROP TABLE IF EXISTS `tbCalendar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCalendar` (
  `calendar_date` date NOT NULL,
  UNIQUE KEY `tbCalendar_unique` (`calendar_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoBPA`
--

DROP TABLE IF EXISTS `tbCiscoBPA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoBPA` (
  `cbpa_id` int(11) NOT NULL AUTO_INCREMENT,
  `cbpa_client_id` int(11) NOT NULL,
  `cbpa_subscription` varchar(40) NOT NULL,
  `cbpa_enabled` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`cbpa_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoCXCloud`
--

DROP TABLE IF EXISTS `tbCiscoCXCloud`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoCXCloud` (
  `cxcloud_id` int(11) NOT NULL AUTO_INCREMENT,
  `cxcloud_contract` int(11) DEFAULT NULL,
  `cxcloud_customer_id` int(11) DEFAULT NULL,
  `cxcloud_parent_company` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `cxcloud_end_customer` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `cxcloud_account` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `cxcloud_service_program` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `cxcloud_service_level` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `cxcloud_renewal_date` date DEFAULT NULL,
  `cxcloud_status` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `cxcloud_onboarded` varchar(50) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `cxcloud_success_track` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  PRIMARY KEY (`cxcloud_id`),
  UNIQUE KEY `tbCiscoCXCloud_cxcloud_contract_IDX` (`cxcloud_contract`,`cxcloud_customer_id`,`cxcloud_parent_company`,`cxcloud_end_customer`,`cxcloud_service_program`,`cxcloud_service_level`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=318 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoEA`
--

DROP TABLE IF EXISTS `tbCiscoEA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoEA` (
  `ea_id` int(11) NOT NULL AUTO_INCREMENT,
  `ea_web_order_id` varchar(20) DEFAULT NULL,
  `ea_product_id` int(11) DEFAULT NULL COMMENT 'product_id',
  `ea_order_submit_date` datetime DEFAULT NULL,
  `ea_order_submitted_by` varchar(50) DEFAULT NULL,
  `ea_provisioning_contact_email` varchar(25) DEFAULT NULL,
  `ea_ccw_line_status` varchar(25) DEFAULT NULL,
  `ea_subscription_id` varchar(25) DEFAULT NULL,
  `ea_requested_start_date` datetime DEFAULT NULL,
  `ea_service_customer_id` int(11) DEFAULT NULL COMMENT 'company_id',
  `ea_end_customer_id` int(11) DEFAULT NULL COMMENT 'company_id',
  `ea_order_value` decimal(18,4) DEFAULT 0.0000,
  `ea_mrc` decimal(18,4) DEFAULT 0.0000,
  `ea_inicial_term` decimal(25,10) DEFAULT 0.0000000000,
  `ea_hold_name` varchar(25) DEFAULT NULL,
  `ea_consumption_status` varchar(30) DEFAULT NULL,
  `ea_over_consumed_tf_groups` mediumtext DEFAULT NULL,
  `ea_tf_groups` mediumtext DEFAULT NULL,
  `ea_tf_effective_date` datetime DEFAULT NULL COMMENT 'True Forward Effective Date',
  `ea_next_tf` datetime DEFAULT NULL COMMENT 'Next True Forward',
  `ea_end_date` datetime DEFAULT NULL COMMENT 'End Date',
  `ea_start_date` datetime DEFAULT NULL,
  `ea_renewal_date` datetime DEFAULT NULL COMMENT 'Renewal Date',
  `ea_currency` varchar(3) DEFAULT NULL COMMENT 'Currency',
  `ea_tf_overage` decimal(30,12) DEFAULT NULL COMMENT 'TF Overage',
  `ea_po` varchar(25) DEFAULT NULL COMMENT 'Purchase Order Number',
  `ea_buying_program_id` varchar(25) DEFAULT NULL COMMENT 'Buying Program ID',
  `ea_site_url` varchar(255) DEFAULT NULL COMMENT 'Site URL',
  `ea_customer_success_manager` varchar(50) DEFAULT NULL COMMENT 'Customer Success Manager',
  `ea_customer_success_manager_email` varchar(50) DEFAULT NULL COMMENT 'Customer Success Manager Email',
  `ea_sales_specialist` varchar(50) DEFAULT NULL COMMENT 'Sales Specialist',
  `ea_sales_specialist_email` varchar(80) DEFAULT NULL COMMENT 'Sales Specialist Email',
  `ea_primary_billing_contact_name` varchar(50) DEFAULT NULL COMMENT 'Primary Billing Contact Name',
  `ea_primary_billing_contact_email` varchar(80) DEFAULT NULL COMMENT 'Primary Billing Contact Email',
  `ea_service_contact_name` varchar(150) DEFAULT NULL COMMENT 'Service To Contact Name',
  `ea_service_contact_email` varchar(80) DEFAULT NULL COMMENT 'Service To Contact Email',
  `ea_end_customer_contact_name` varchar(150) DEFAULT NULL COMMENT 'End Customer Contact Name',
  `ea_end_customer_contact_email` varchar(50) DEFAULT NULL COMMENT 'End Customer Contact Email',
  `ea_end_customer_contact_phone` varchar(20) DEFAULT NULL COMMENT 'End Customer Contact Phone',
  `ea_smart_account_name` varchar(150) DEFAULT NULL COMMENT 'Smart Account Name',
  `ea_renewal_manager` varchar(50) DEFAULT NULL COMMENT 'Renewal Manager',
  `ea_renewal_manager_email` varchar(50) DEFAULT NULL COMMENT 'Renewal Manager Email',
  `ea_provisioning_status` varchar(25) DEFAULT NULL COMMENT 'Provisioning Status',
  `ea_magic_key` varchar(20) DEFAULT NULL COMMENT 'MAGIC KEY',
  `ea_end_date_task_id` int(11) DEFAULT 0,
  `ea_new_task_id` int(11) DEFAULT 0,
  `ea_pending_tf_effective_date` date DEFAULT NULL,
  `ea_consumed_suite_value_percent` decimal(10,8) DEFAULT NULL,
  `ea_exceptional_growth_anniversary` date DEFAULT NULL,
  `ea_exceptional_growth_tf_eligible` varchar(3) DEFAULT NULL COMMENT 'YES or NO',
  PRIMARY KEY (`ea_id`),
  KEY `tbCiscoEA_ea_web_order_id_IDX` (`ea_web_order_id`,`ea_product_id`,`ea_subscription_id`,`ea_service_customer_id`,`ea_end_customer_id`,`ea_magic_key`) USING BTREE,
  KEY `idx_tbCiscoEA_prod_cust_sub_dates` (`ea_product_id`,`ea_end_customer_id`,`ea_subscription_id`,`ea_end_date`,`ea_start_date`)
) ENGINE=InnoDB AUTO_INCREMENT=11749 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoEnterpriseAgreementMetering`
--

DROP TABLE IF EXISTS `tbCiscoEnterpriseAgreementMetering`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoEnterpriseAgreementMetering` (
  `mcea_id` int(11) NOT NULL AUTO_INCREMENT,
  `mcea_client_id` int(11) NOT NULL DEFAULT 0,
  `mcea_client` varchar(255) NOT NULL,
  `mcea_domain` varchar(50) NOT NULL,
  `mcea_virtual_account` varchar(80) NOT NULL,
  `mcea_subscription` varchar(50) DEFAULT NULL,
  `mcea_ntf_date` date DEFAULT NULL,
  `mcea_status` varchar(20) DEFAULT NULL,
  `mcea_start_date` date DEFAULT NULL,
  `mcea_end_date` date DEFAULT NULL,
  `mcea_suite_name` varchar(150) DEFAULT NULL,
  `mcea_calculation_method` varchar(40) DEFAULT NULL,
  `mcea_product_id` int(11) NOT NULL DEFAULT 0,
  `mcea_sku` varchar(150) DEFAULT NULL,
  `mcea_purchased` int(11) NOT NULL DEFAULT 0,
  `mcea_growth_allowance` int(11) NOT NULL DEFAULT 0,
  `mcea_total_purchased` int(11) NOT NULL DEFAULT 0,
  `mcea_generated` int(11) NOT NULL DEFAULT 0,
  `mcea_balance` int(11) NOT NULL DEFAULT 0,
  `mcea_pre_ea` int(11) NOT NULL DEFAULT 0,
  `mcea_license_migrated` int(11) NOT NULL DEFAULT 0,
  `mcea_update` date NOT NULL DEFAULT curdate(),
  `mcea_track` tinyint(4) DEFAULT 0,
  PRIMARY KEY (`mcea_id`),
  KEY `tbMeasureCiscoEA_mcea_client_id_IDX` (`mcea_client_id`,`mcea_domain`,`mcea_virtual_account`,`mcea_subscription`,`mcea_start_date`,`mcea_end_date`,`mcea_suite_name`,`mcea_calculation_method`,`mcea_product_id`,`mcea_sku`,`mcea_purchased`,`mcea_growth_allowance`,`mcea_total_purchased`,`mcea_generated`,`mcea_balance`,`mcea_pre_ea`,`mcea_license_migrated`) USING BTREE,
  KEY `idx_mcea_latest` (`mcea_client_id`,`mcea_domain`,`mcea_virtual_account`,`mcea_subscription`,`mcea_start_date`,`mcea_end_date`,`mcea_suite_name`,`mcea_sku`,`mcea_update`,`mcea_id`),
  KEY `idx_tbMeasureCiscoEA_cust_sub_prod_suite_dates` (`mcea_client_id`,`mcea_subscription`,`mcea_product_id`,`mcea_suite_name`,`mcea_end_date`,`mcea_start_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5339 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoReadyTemporary`
--

DROP TABLE IF EXISTS `tbCiscoReadyTemporary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoReadyTemporary` (
  `ready_id` int(11) NOT NULL AUTO_INCREMENT,
  `seller_name` varchar(255) DEFAULT NULL,
  `source_seller_id` int(11) DEFAULT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `source_account_id` int(11) DEFAULT NULL,
  `install_site_country` varchar(255) DEFAULT NULL,
  `install_site_state` varchar(255) DEFAULT NULL,
  `install_site_city` varchar(255) DEFAULT NULL,
  `install_site_postal_code` varchar(255) DEFAULT NULL,
  `install_site_address_line_1` varchar(255) DEFAULT NULL,
  `source_contract_id` int(11) DEFAULT NULL,
  `contract_type` varchar(255) DEFAULT NULL,
  `contract_description` mediumtext DEFAULT NULL,
  `coverage_start_date` date DEFAULT NULL,
  `coverage_end_date` date DEFAULT NULL,
  `source_product_id` int(11) DEFAULT NULL,
  `product_type` varchar(255) DEFAULT NULL,
  `product_description` mediumtext DEFAULT NULL,
  `vendor_name` varchar(255) DEFAULT NULL,
  `source_asset_id` int(11) DEFAULT NULL,
  `source_parent_asset_id` int(11) DEFAULT NULL,
  `serial_number` varchar(255) DEFAULT NULL,
  `product_activation_key` varchar(255) DEFAULT NULL,
  `subscription_id` varchar(255) DEFAULT NULL,
  `asset_type` varchar(255) DEFAULT NULL,
  `end_of_life_announcement_date` date DEFAULT NULL,
  `software_maintenance_end_date` date DEFAULT NULL,
  `last_renewal_date` date DEFAULT NULL,
  `routine_failure_analysis_end_date` date DEFAULT NULL,
  `security_support_end_date` date DEFAULT NULL,
  `warranty_end_date` date DEFAULT NULL,
  `warranty_type` varchar(255) DEFAULT NULL,
  `last_date_of_support` date DEFAULT NULL,
  `item_quantity` decimal(18,4) DEFAULT NULL,
  `product_list_price` decimal(20,8) DEFAULT NULL,
  `default_service_list_price` decimal(20,8) DEFAULT NULL,
  `current_coverage_list_price` decimal(20,8) DEFAULT NULL,
  `service_level` varchar(255) DEFAULT NULL,
  `currency` varchar(100) DEFAULT NULL,
  `product_sales_order_id` int(11) DEFAULT NULL,
  `product_purchase_order_id` int(11) DEFAULT NULL,
  `service_sales_order_id` int(11) DEFAULT NULL,
  `service_purchase_order_id` int(11) DEFAULT NULL,
  `product_billing_partner_name` varchar(255) DEFAULT NULL,
  `service_billing_partner_name` varchar(255) DEFAULT NULL,
  `is_terminated` varchar(10) DEFAULT NULL,
  `source_system` varchar(255) DEFAULT NULL,
  `cisco_account_gu_name` varchar(255) DEFAULT NULL,
  `cisco_is_mapped_to_swss` varchar(10) DEFAULT NULL,
  `cisco_is_st_eligible` varchar(10) DEFAULT NULL,
  `cisco_product_architecture` varchar(255) DEFAULT NULL,
  `cisco_product_sub_architecture` varchar(255) DEFAULT NULL,
  `cisco_product_family` varchar(255) DEFAULT NULL,
  `cisco_license_product_id` int(11) DEFAULT NULL,
  `cisco_do_not_renew_reason` varchar(255) DEFAULT NULL,
  `cisco_product_sale_end_date` date DEFAULT NULL,
  `cisco_migration_pid_list` varchar(255) DEFAULT NULL,
  `cisco_buying_program` varchar(255) DEFAULT NULL,
  `cisco_is_auto_renewal` varchar(10) DEFAULT NULL,
  `cisco_is_available_to_renew` varchar(10) DEFAULT NULL,
  `cisco_is_st_current` varchar(10) DEFAULT NULL,
  `cisco_is_ela` varchar(10) DEFAULT NULL,
  `cisco_is_transactional_ai` varchar(10) DEFAULT NULL,
  `vendor_seller_id` int(11) DEFAULT NULL,
  `vendor_account_id` int(11) DEFAULT NULL,
  `vendor_contract_id` int(11) DEFAULT NULL,
  `vendor_product_id` int(11) DEFAULT NULL,
  `vendor_asset_id` int(11) DEFAULT NULL,
  `vendor_parent_asset_id` int(11) DEFAULT NULL,
  `instance_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`ready_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1813 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoSPI`
--

DROP TABLE IF EXISTS `tbCiscoSPI`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoSPI` (
  `spi_id` int(11) NOT NULL AUTO_INCREMENT,
  `spi_customer_id` int(11) DEFAULT 0 COMMENT 'Global Company Name',
  `spi_architecture` varchar(255) NOT NULL COMMENT 'Architecture Cisco',
  `spi_solution_domain` varchar(255) NOT NULL COMMENT 'Solution Domain; to tbTask.task_track',
  `spi_use_case` varchar(255) NOT NULL COMMENT 'Use Case; to tbTask.task_sub_track',
  `spi_telemetry_type` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `spi_lifecycle_stage` varchar(50) DEFAULT NULL,
  `spi_last_checked_date` date DEFAULT NULL,
  PRIMARY KEY (`spi_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3385 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoSPILCI`
--

DROP TABLE IF EXISTS `tbCiscoSPILCI`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoSPILCI` (
  `spilci_id` int(11) NOT NULL AUTO_INCREMENT,
  `spilci_solution_domain` varchar(255) DEFAULT NULL,
  `spilci_use_case` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT 'SPI',
  `spilci_track` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT 'LCI',
  PRIMARY KEY (`spilci_id`),
  KEY `tbCiscoSPILCI_spilci_architecture_IDX` (`spilci_solution_domain`,`spilci_use_case`,`spilci_track`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoSPItoLCIMapping`
--

DROP TABLE IF EXISTS `tbCiscoSPItoLCIMapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoSPItoLCIMapping` (
  `spilci_id` int(11) NOT NULL AUTO_INCREMENT,
  `spilci_architecture` varchar(255) DEFAULT NULL COMMENT 'Cisco Architecture',
  `spilci_solution_domain` varchar(255) DEFAULT NULL COMMENT 'Cisco Solution',
  `spilci_use_case` varchar(255) DEFAULT NULL COMMENT 'from Cisco SPI use case',
  `spilci_subtrack` varchar(255) DEFAULT NULL COMMENT 'to Cisco LCI subtrack',
  PRIMARY KEY (`spilci_id`),
  KEY `tbCiscoSPItoLCIMapping_spilci_architecture_IDX` (`spilci_architecture`,`spilci_solution_domain`,`spilci_use_case`,`spilci_subtrack`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoSmartAccountMetering`
--

DROP TABLE IF EXISTS `tbCiscoSmartAccountMetering`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoSmartAccountMetering` (
  `mcsa_id` int(11) NOT NULL AUTO_INCREMENT,
  `mcsa_row_type` varchar(10) NOT NULL,
  `mcsa_client_id` int(11) NOT NULL DEFAULT 0,
  `mcsa_client` varchar(255) NOT NULL,
  `mcsa_domain` varchar(50) NOT NULL,
  `mcsa_product_id` int(11) NOT NULL DEFAULT 0,
  `mcsa_license` varchar(255) NOT NULL,
  `mcsa_virtual_account` varchar(80) NOT NULL,
  `mcsa_billing` varchar(40) DEFAULT '-',
  `mcsa_available_to_use` int(11) DEFAULT NULL,
  `mcsa_in_use` int(11) DEFAULT NULL,
  `mcsa_balance` int(11) DEFAULT NULL,
  `mcsa_compliance` varchar(40) DEFAULT NULL,
  `mcsa_license_type` varchar(20) DEFAULT '-',
  `mcsa_quantity` int(11) DEFAULT NULL,
  `mcsa_subscription` varchar(50) DEFAULT '-',
  `mcsa_days_to_end` int(11) DEFAULT NULL,
  `mcsa_active` varchar(10) DEFAULT NULL,
  `mcsa_start_date` date DEFAULT NULL,
  `mcsa_end_date` date DEFAULT NULL,
  `mcsa_update` date NOT NULL DEFAULT curdate(),
  `mcsa_track` tinyint(4) DEFAULT 0,
  PRIMARY KEY (`mcsa_id`),
  UNIQUE KEY `tbMeasureCiscoSA_mcsa_row_type_IDX` (`mcsa_row_type`,`mcsa_client_id`,`mcsa_domain`,`mcsa_license`,`mcsa_virtual_account`,`mcsa_billing`,`mcsa_available_to_use`,`mcsa_in_use`,`mcsa_balance`,`mcsa_compliance`,`mcsa_license_type`,`mcsa_quantity`,`mcsa_subscription`,`mcsa_start_date`,`mcsa_end_date`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=101175 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCiscoWebOrder`
--

DROP TABLE IF EXISTS `tbCiscoWebOrder`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCiscoWebOrder` (
  `weborder_id` int(11) NOT NULL AUTO_INCREMENT,
  `weborder_number` varchar(20) DEFAULT '-',
  `weborder_customer_id` int(11) DEFAULT 0,
  PRIMARY KEY (`weborder_id`),
  UNIQUE KEY `tbCiscoWebOrder_weborder_IDX` (`weborder_number`,`weborder_customer_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=8453 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbClientFarol`
--

DROP TABLE IF EXISTS `tbClientFarol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbClientFarol` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vendor_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `refreshed_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vendor_customer` (`vendor_id`,`customer_id`),
  KEY `idx_customer_name` (`customer_name`)
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbClientLicenseUsageTracking`
--

DROP TABLE IF EXISTS `tbClientLicenseUsageTracking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbClientLicenseUsageTracking` (
  `clut_id` int(11) NOT NULL AUTO_INCREMENT,
  `clut_client_id` int(11) DEFAULT NULL,
  `clut_vendor_id` int(11) NOT NULL DEFAULT 0,
  `clut_license_type` varchar(40) DEFAULT NULL,
  `clut_license_name` varchar(255) NOT NULL,
  `clut_perpetual` tinyint(4) NOT NULL DEFAULT 0,
  `clut_date` date DEFAULT NULL,
  `clut_quantity` int(11) NOT NULL DEFAULT 0,
  `clut_domain` varchar(50) DEFAULT NULL,
  `clut_virtual_account` varchar(80) DEFAULT NULL,
  `clut_id_in_source_table` int(11) DEFAULT NULL,
  `clut_growth_allowance` int(11) DEFAULT 0,
  PRIMARY KEY (`clut_id`)
) ENGINE=InnoDB AUTO_INCREMENT=916015 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbColumnsXLS`
--

DROP TABLE IF EXISTS `tbColumnsXLS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbColumnsXLS` (
  `columnsxls_id` int(11) NOT NULL AUTO_INCREMENT,
  `columnsxls_classification` varchar(255) DEFAULT NULL,
  `columnsxls_type` varchar(50) DEFAULT NULL,
  `columnsxls_usedfor` varchar(100) DEFAULT NULL,
  `columnsxls_vendor_id` int(11) DEFAULT NULL,
  `columnsxls_remark` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`columnsxls_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbColumnsXLSFrom`
--

DROP TABLE IF EXISTS `tbColumnsXLSFrom`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbColumnsXLSFrom` (
  `columnsxlsfrom_id` int(11) NOT NULL AUTO_INCREMENT,
  `columnsxlsfrom_columnsxls_id` int(11) DEFAULT NULL,
  `columnsxlsfrom_header` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`columnsxlsfrom_id`)
) ENGINE=InnoDB AUTO_INCREMENT=197 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbColumnsXLSTo`
--

DROP TABLE IF EXISTS `tbColumnsXLSTo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbColumnsXLSTo` (
  `columnsxlsto_id` int(11) NOT NULL AUTO_INCREMENT,
  `columnsxlsto_columnsxlsfrom_id` int(11) DEFAULT NULL,
  `columnsxlsto_table` varchar(50) DEFAULT NULL,
  `columnsxlsto_field` varchar(80) DEFAULT NULL,
  `columnsxlsto_fieldref` varchar(80) DEFAULT NULL,
  `columnsxlsto_condition` varchar(20) DEFAULT NULL,
  `columnsxlsto_conditionfield` varchar(80) DEFAULT NULL,
  `columnsxlsto_conditionvalue` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`columnsxlsto_id`)
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCompany`
--

DROP TABLE IF EXISTS `tbCompany`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCompany` (
  `company_id` int(11) NOT NULL AUTO_INCREMENT,
  `company_is_vendor` varchar(3) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT 'NO' COMMENT 'YES para Vendor, NO para não é Vendor',
  `company_type` varchar(25) DEFAULT 'WILL NOT COVER',
  `company_name` varchar(255) DEFAULT NULL,
  `company_priority` varchar(2) DEFAULT NULL,
  `company_vertical` varchar(150) DEFAULT NULL,
  `company_meeting_frequency` varchar(100) DEFAULT NULL,
  `company_logo` text CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `company_homepage` varchar(255) DEFAULT NULL,
  `company_remark` text DEFAULT NULL,
  `company_cnpj` varchar(14) DEFAULT NULL,
  `company_group_id` int(11) DEFAULT 0,
  PRIMARY KEY (`company_id`),
  UNIQUE KEY `tbCompany_company_name_IDX` (`company_name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=5569 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCompanyEconomicGroup`
--

DROP TABLE IF EXISTS `tbCompanyEconomicGroup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCompanyEconomicGroup` (
  `group_id` int(11) NOT NULL AUTO_INCREMENT,
  `group_name` varchar(150) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`group_id`),
  UNIQUE KEY `uq_tbCompanyEconomicGroup_group_name` (`group_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2472 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCompanyFiscalData`
--

DROP TABLE IF EXISTS `tbCompanyFiscalData`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCompanyFiscalData` (
  `companyfiscaldata_id` int(11) NOT NULL AUTO_INCREMENT,
  `companyfiscaldata_company_id` int(11) DEFAULT NULL,
  `companyfiscaldata_companylistname_id` int(11) DEFAULT NULL,
  `companyfiscaldata_cnpj_cpf` varchar(20) DEFAULT NULL,
  `companyfiscaldata_ie` varchar(15) DEFAULT NULL,
  `companyfiscaldata_address` varchar(255) DEFAULT NULL,
  `companyfiscaldata_city` varchar(100) CHARACTER SET utf32 COLLATE utf32_general_ci DEFAULT NULL,
  `companyfiscaldata_state` varchar(100) DEFAULT NULL,
  `companyfiscaldata_zipcode` varchar(50) DEFAULT NULL,
  `companyfiscaldata_country` varchar(100) DEFAULT NULL,
  `companyfiscaldata_neighborhood` varchar(100) DEFAULT NULL,
  `companyfiscaldata_complement` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`companyfiscaldata_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4272 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCompanyListName`
--

DROP TABLE IF EXISTS `tbCompanyListName`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCompanyListName` (
  `companylistname_company_id` int(11) DEFAULT NULL,
  `companylistname_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `companylistname_id` int(11) NOT NULL AUTO_INCREMENT,
  UNIQUE KEY `companylistname_id` (`companylistname_id`),
  KEY `idx_companylistname_name` (`companylistname_name`)
) ENGINE=InnoDB AUTO_INCREMENT=13203 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCompanyNameSuggestion`
--

DROP TABLE IF EXISTS `tbCompanyNameSuggestion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCompanyNameSuggestion` (
  `suggestion_id` int(11) NOT NULL AUTO_INCREMENT,
  `suggestion_input_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `suggestion_suggested_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `suggestion_company_id` int(11) DEFAULT NULL,
  `suggestion_score` float DEFAULT NULL,
  `suggestion_action` varchar(3) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL COMMENT 'add = para adicionar usando sugestão ou new = para inserir nova empresa',
  `suggestion_created_at` datetime DEFAULT NULL,
  `suggestion_created_by` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  PRIMARY KEY (`suggestion_id`)
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCompanySite`
--

DROP TABLE IF EXISTS `tbCompanySite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCompanySite` (
  `site_id` int(11) NOT NULL AUTO_INCREMENT,
  `site_company_id` int(11) NOT NULL DEFAULT 0,
  `site_name` varchar(100) NOT NULL,
  `site_cnpj` varchar(18) DEFAULT NULL,
  `site_ie` varchar(20) DEFAULT NULL,
  `site_address` varchar(255) DEFAULT NULL,
  `site_city` varchar(100) DEFAULT NULL,
  `site_uf` varchar(2) DEFAULT NULL,
  `site_country` varchar(20) DEFAULT 'Brasil',
  PRIMARY KEY (`site_id`),
  KEY `tbCompanySite_site_company_id_IDX` (`site_company_id`,`site_name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbContractNTTAsset`
--

DROP TABLE IF EXISTS `tbContractNTTAsset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbContractNTTAsset` (
  `nttasset_id` int(11) NOT NULL AUTO_INCREMENT,
  `nttasset_vendor_id` int(11) DEFAULT 0,
  `nttasset_vendor_name` varchar(150) DEFAULT NULL,
  `nttasset_nttcontract_id` int(11) DEFAULT NULL,
  `nttasset_contract_number` varchar(12) DEFAULT '-',
  `nttasset_customer_id` int(11) DEFAULT 0,
  `nttasset_customer_name` varchar(255) DEFAULT NULL,
  `nttasset_am_id` int(11) DEFAULT 0,
  `nttasset_am_name` varchar(150) DEFAULT NULL,
  `nttasset_asset_id` int(11) DEFAULT NULL,
  `nttasset_product_id` int(11) DEFAULT 0,
  `nttasset_product` varchar(100) DEFAULT NULL,
  `nttasset_contract_description` text DEFAULT NULL,
  `nttasset_serial_num` varchar(50) DEFAULT NULL,
  `nttasset_instance_num` varchar(100) DEFAULT NULL,
  `nttasset_subscription_id` varchar(150) DEFAULT NULL,
  `nttasset_oracle_id` int(11) DEFAULT NULL,
  `nttasset_line` int(11) DEFAULT NULL,
  `nttasset_subline` int(11) DEFAULT NULL,
  `nttasset_apolo_id` int(11) DEFAULT NULL,
  `nttasset_entitlement_id` int(11) DEFAULT NULL,
  `nttasset_entitlement` varchar(255) DEFAULT NULL,
  `nttasset_ov` varchar(50) DEFAULT NULL,
  `nttasset_po` varchar(50) DEFAULT NULL,
  `nttasset_contract_start` date DEFAULT NULL,
  `nttasset_contract_end` date DEFAULT NULL,
  `nttasset_asset_start` date DEFAULT NULL,
  `nttasset_asset_end` date DEFAULT NULL,
  `nttasset_product_status` varchar(50) DEFAULT NULL,
  `nttasset_address1` varchar(255) DEFAULT NULL,
  `nttasset_address2` varchar(255) DEFAULT NULL,
  `nttasset_address3` varchar(255) DEFAULT NULL,
  `nttasset_city` varchar(100) DEFAULT NULL,
  `nttasset_postal_code` varchar(20) DEFAULT NULL,
  `nttasset_state` varchar(2) DEFAULT NULL,
  `nttasset_country` varchar(100) DEFAULT NULL,
  `nttasset_status_renewal` varchar(50) DEFAULT NULL,
  `nttasset_parts_contract` varchar(255) DEFAULT NULL,
  `nttasset_quote_ref` varchar(255) DEFAULT NULL,
  `nttasset_service_type` varchar(80) DEFAULT NULL,
  `nttasset_service_level` varchar(40) DEFAULT NULL,
  `nttasset_service_status` varchar(50) DEFAULT NULL,
  `nttasset_quote` varchar(50) DEFAULT NULL,
  `nttasset_shortdescription` text DEFAULT NULL,
  `nttasset_gross_profit` decimal(18,4) DEFAULT NULL,
  `nttasset_price` decimal(20,4) DEFAULT NULL,
  `nttasset_currency` varchar(3) DEFAULT NULL,
  `nttasset_quantity` decimal(18,4) DEFAULT NULL,
  `nttasset_contract_amount` decimal(20,4) DEFAULT 0.0000,
  `nttasset_acc_rule` varchar(25) DEFAULT NULL,
  `nttasset_date_terminated` date DEFAULT NULL,
  PRIMARY KEY (`nttasset_id`),
  KEY `tbnttasset_nttasset_nttcontract_id_IDX` (`nttasset_nttcontract_id`,`nttasset_asset_id`,`nttasset_line`,`nttasset_subline`,`nttasset_entitlement_id`) USING BTREE,
  KEY `idx_nttasset_asset_id` (`nttasset_asset_id`),
  KEY `idx_nttasset_customer_id` (`nttasset_customer_id`),
  KEY `idx_nttasset_vendor_id` (`nttasset_vendor_id`),
  KEY `idx_nttasset_product_id` (`nttasset_product_id`),
  KEY `idx_nttasset_am_id` (`nttasset_am_id`),
  KEY `idx_nttasset_asset_end_id` (`nttasset_asset_id`,`nttasset_contract_end`,`nttasset_id`,`nttasset_customer_id`,`nttasset_contract_number`)
) ENGINE=InnoDB AUTO_INCREMENT=285006 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbContractVendorAsset`
--

DROP TABLE IF EXISTS `tbContractVendorAsset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbContractVendorAsset` (
  `vendorasset_id` int(11) NOT NULL AUTO_INCREMENT,
  `vendorasset_contract_num` varchar(50) DEFAULT NULL,
  `vendorasset_vendor_id` int(11) NOT NULL DEFAULT 0,
  `vendorasset_vendor_name` varchar(255) DEFAULT NULL,
  `vendorasset_customer_id` int(11) NOT NULL DEFAULT 0,
  `vendorasset_asset_id` int(11) NOT NULL DEFAULT 0,
  `vendorasset_product_id` int(11) DEFAULT 0,
  `vendorasset_start` date DEFAULT NULL,
  `vendorasset_end` date DEFAULT NULL,
  `vendorasset_status` varchar(50) DEFAULT NULL,
  `vendorasset_renewal` date DEFAULT NULL,
  `vendorasset_auto_renewal` varchar(50) DEFAULT NULL,
  `vendorasset_billing_frequency` varchar(50) DEFAULT NULL,
  `vendorasset_sku` varchar(100) DEFAULT NULL,
  `vendorasset_service_level` varchar(150) DEFAULT NULL,
  `vendorasset_quantity` decimal(10,2) DEFAULT NULL,
  `vendorasset_product_price` decimal(18,8) DEFAULT NULL,
  `vendorasset_service_price` decimal(18,8) DEFAULT NULL,
  `vendorasset_subscription_id` varchar(50) DEFAULT NULL,
  `vendorasset_web_order_id` varchar(50) DEFAULT NULL,
  `vendorasset_deal_id` varchar(100) DEFAULT NULL,
  `vendorasset_installed_status` varchar(50) DEFAULT NULL,
  `vendorasset_smart_account` varchar(150) DEFAULT NULL,
  `vendorasset_product_so` varchar(50) DEFAULT NULL,
  `vendorasset_product_po` varchar(50) DEFAULT NULL,
  `vendorasset_service_so` varchar(50) DEFAULT NULL,
  `vendorasset_service_po` varchar(50) DEFAULT NULL,
  `vendorasset_maintenance_so` varchar(50) DEFAULT NULL,
  `vendorasset_maintenance_po` varchar(50) DEFAULT NULL,
  `vendorasset_quote` varchar(25) DEFAULT NULL,
  `vendorasset_contract_type` varchar(100) DEFAULT NULL,
  `vendorasset_coverage` varchar(50) DEFAULT NULL,
  `vendorasset_coverage_status` varchar(50) DEFAULT NULL,
  `vendorasset_buying_program` varchar(100) DEFAULT NULL,
  `vendorasset_suport_service_level` varchar(150) DEFAULT NULL,
  `vendorasset_install_site_gu_name` varchar(255) DEFAULT NULL,
  `vendorasset_install_site_cr_parent_name` varchar(255) DEFAULT NULL,
  `vendorasset_install_site_cr_party_name` varchar(255) DEFAULT NULL,
  `vendorasset_install_site_name` varchar(255) DEFAULT NULL,
  `vendorasset_best_partner_be_geo_id` int(11) DEFAULT NULL,
  `vendorasset_best_partner_be_geo_name` varchar(255) DEFAULT NULL,
  `vendorasset_product_bill_to_partner_name` varchar(255) DEFAULT NULL,
  `vendorasset_product_partner_geo_geo_name` varchar(255) DEFAULT NULL,
  `vendorasset_pos_partner_be_geo_name` varchar(255) DEFAULT NULL,
  `vendorasset_service_bill_partner_name` varchar(255) DEFAULT NULL,
  `vendorasset_service_partner_be_geo_name` varchar(255) DEFAULT NULL,
  `vendorasset_service_indicator` varchar(20) DEFAULT NULL,
  `vendorasset_date_booked` datetime DEFAULT NULL,
  `vendorasset_date_ordered` datetime DEFAULT NULL,
  `vendorasset_remark` mediumtext DEFAULT NULL,
  `vendorasset_contract_description` text DEFAULT NULL,
  `vendorasset_migration_pid_list` mediumtext DEFAULT NULL,
  `vendorasset_existing_coverage_level_list_price` decimal(18,8) DEFAULT NULL,
  `vendorasset_atr_eligible` varchar(1) DEFAULT NULL COMMENT 'Y or N',
  `vendorasset_do_not_renew_reason` varchar(100) DEFAULT NULL,
  `vendorasset_end_fy_vendor` int(4) DEFAULT NULL,
  `vendorasset_end_fq_vendor` int(1) DEFAULT NULL,
  `vendorasset_end_fy_ntt` int(4) DEFAULT NULL,
  `vendorasset_end_fq_ntt` int(1) DEFAULT NULL,
  `vendorasset_end_fy_calendar` int(4) DEFAULT NULL,
  `vendorasset_end_fq_calendar` int(1) DEFAULT NULL,
  `vendorasset_statustyperenewal_id` int(11) DEFAULT 0,
  PRIMARY KEY (`vendorasset_id`),
  UNIQUE KEY `tbvendorasset_vendorasset_contract_num_IDX` (`vendorasset_contract_num`,`vendorasset_vendor_id`,`vendorasset_customer_id`,`vendorasset_asset_id`,`vendorasset_start`,`vendorasset_end`,`vendorasset_quantity`,`vendorasset_product_price`,`vendorasset_subscription_id`,`vendorasset_web_order_id`,`vendorasset_deal_id`,`vendorasset_product_so`,`vendorasset_product_po`,`vendorasset_service_so`,`vendorasset_service_po`,`vendorasset_maintenance_so`,`vendorasset_maintenance_po`,`vendorasset_suport_service_level`,`vendorasset_service_indicator`,`vendorasset_service_level`) USING BTREE,
  KEY `idx_vendorasset_asset_id` (`vendorasset_asset_id`),
  KEY `idx_vendorasset_customer_id` (`vendorasset_customer_id`),
  KEY `idx_vendorasset_vendor_id` (`vendorasset_vendor_id`),
  KEY `idx_vendorasset_product_id` (`vendorasset_product_id`),
  KEY `idx_vendorasset_key` (`vendorasset_vendor_id`,`vendorasset_asset_id`,`vendorasset_product_id`,`vendorasset_customer_id`,`vendorasset_contract_num`,`vendorasset_subscription_id`,`vendorasset_web_order_id`,`vendorasset_product_so`,`vendorasset_product_po`,`vendorasset_service_so`,`vendorasset_service_po`),
  KEY `idx_vendorasset_asset_end_id` (`vendorasset_asset_id`,`vendorasset_end`,`vendorasset_id`,`vendorasset_customer_id`,`vendorasset_contract_num`),
  KEY `idx_tbContractVendorAsset_asset_customer` (`vendorasset_asset_id`,`vendorasset_customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=248877 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCurrencyRate`
--

DROP TABLE IF EXISTS `tbCurrencyRate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCurrencyRate` (
  `rate_id` int(11) NOT NULL AUTO_INCREMENT,
  `rate_fiscalyear` int(11) DEFAULT NULL,
  `rate_currency` varchar(3) DEFAULT NULL,
  `rate_value` decimal(10,4) DEFAULT NULL,
  PRIMARY KEY (`rate_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCustomerLicenseAccount`
--

DROP TABLE IF EXISTS `tbCustomerLicenseAccount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCustomerLicenseAccount` (
  `account_id` int(11) NOT NULL AUTO_INCREMENT,
  `vendor_id` int(11) NOT NULL DEFAULT 0,
  `customer_id` int(11) NOT NULL DEFAULT 0,
  `account_name` varchar(150) DEFAULT NULL,
  `account_domain` varchar(100) NOT NULL,
  `virtual_account` varchar(100) DEFAULT NULL,
  `ntt_role` varchar(50) DEFAULT NULL,
  `ntt_logs_in_by` varchar(100) DEFAULT NULL,
  `account_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `remark` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`account_id`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci COMMENT='Cadastro de contas e domain de clientes para acesso licenças';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbCustomerLicenseAccountAdmin`
--

DROP TABLE IF EXISTS `tbCustomerLicenseAccountAdmin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbCustomerLicenseAccountAdmin` (
  `admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_account_id` int(11) DEFAULT 0,
  `admin_user_id` int(11) DEFAULT 0,
  `admin_role` varchar(100) DEFAULT NULL,
  `admin_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `remark` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbDayOff`
--

DROP TABLE IF EXISTS `tbDayOff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbDayOff` (
  `dayoff_id` int(11) NOT NULL AUTO_INCREMENT,
  `dayoff_user_id` int(11) NOT NULL,
  `dayoff_start_date` date NOT NULL,
  `dayoff_end_date` date NOT NULL,
  PRIMARY KEY (`dayoff_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbDepartment`
--

DROP TABLE IF EXISTS `tbDepartment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbDepartment` (
  `department_id` int(11) NOT NULL AUTO_INCREMENT,
  `department_name` varchar(100) DEFAULT NULL,
  `department_pctadmin` varchar(50) DEFAULT NULL,
  `department_pctworksheet` varchar(50) DEFAULT NULL,
  `department_area` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`department_id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbEntitlement`
--

DROP TABLE IF EXISTS `tbEntitlement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbEntitlement` (
  `entitlement_id` int(11) NOT NULL AUTO_INCREMENT,
  `entitlement_service` varchar(80) DEFAULT NULL,
  `entitlement_direct_item_category` varchar(80) DEFAULT NULL,
  `entitlement_direct_name` varchar(255) DEFAULT NULL,
  `entitlement_sales_order_name` varchar(255) DEFAULT NULL,
  `entitlement_item_faturamento` varchar(150) DEFAULT NULL,
  `entitlement_contract_name` varchar(255) DEFAULT NULL,
  `entitlement_name` varchar(255) DEFAULT NULL,
  `entitlement_itsm_template` varchar(255) DEFAULT NULL,
  `entilement_short_description` mediumtext DEFAULT NULL,
  `entitlement_long_description` text DEFAULT NULL,
  `entitlement_service_properties` text DEFAULT NULL,
  `entitlement_source_reference` varchar(255) DEFAULT NULL,
  `entitlements_updated` date DEFAULT NULL,
  PRIMARY KEY (`entitlement_id`),
  UNIQUE KEY `tbEntitlement_entitlement_name_IDX` (`entitlement_name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=286 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbError`
--

DROP TABLE IF EXISTS `tbError`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbError` (
  `error_id` int(11) NOT NULL AUTO_INCREMENT,
  `error_function` varchar(255) DEFAULT NULL,
  `error_command` mediumtext DEFAULT NULL,
  `error_description` text DEFAULT NULL,
  `error_datetime` datetime DEFAULT current_timestamp(),
  `error_traceback` text DEFAULT NULL,
  PRIMARY KEY (`error_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbFarol`
--

DROP TABLE IF EXISTS `tbFarol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbFarol` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vendor_id` int(11) NOT NULL,
  `architecture` varchar(100) NOT NULL,
  `solution` varchar(100) NOT NULL,
  `product_name` varchar(200) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `farol` varchar(255) DEFAULT NULL,
  `refreshed_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1376236 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbHeatmap`
--

DROP TABLE IF EXISTS `tbHeatmap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbHeatmap` (
  `heatmap_id` int(11) NOT NULL AUTO_INCREMENT,
  `heatmap_customer_id` int(11) DEFAULT 0,
  `heatmap_vendor_id` int(11) DEFAULT NULL,
  `heatmap_sales_status` varchar(30) DEFAULT NULL COMMENT 'Sold by NTT, In Proposal, Decommissioned, Sold by the Competitor',
  `heatmap_technology_domain` varchar(20) DEFAULT NULL,
  `heatmap_competitor_present` varchar(255) DEFAULT NULL,
  `heatmap_remark` text DEFAULT NULL,
  PRIMARY KEY (`heatmap_id`)
) ENGINE=InnoDB AUTO_INCREMENT=487 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci COMMENT='Heatmap utilizada pelos  time PreSales';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbHeatmapHistory`
--

DROP TABLE IF EXISTS `tbHeatmapHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbHeatmapHistory` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `history_customer_id` int(11) DEFAULT 0,
  `history_technology_domain` varchar(20) DEFAULT NULL,
  `history_created_by` varchar(50) DEFAULT NULL,
  `history_created_at` datetime DEFAULT current_timestamp(),
  `history_remark` text DEFAULT NULL,
  PRIMARY KEY (`history_id`)
) ENGINE=InnoDB AUTO_INCREMENT=492 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbHolidays`
--

DROP TABLE IF EXISTS `tbHolidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbHolidays` (
  `holiday_id` int(11) NOT NULL AUTO_INCREMENT,
  `holiday_date` datetime DEFAULT NULL,
  `holiday_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`holiday_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbImportControl`
--

DROP TABLE IF EXISTS `tbImportControl`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbImportControl` (
  `importctrl_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único do registro de controle de importação',
  `importctrl_source` varchar(50) NOT NULL COMMENT 'Origem da importação, por exemplo: CiscoSubscriptionCCW',
  `importctrl_file` varchar(255) NOT NULL COMMENT 'Nome ou caminho do arquivo XLSX sendo importado',
  `importctrl_status` varchar(20) NOT NULL COMMENT 'Status da execução: PENDING, RUNNING, FINISHED, FAILED',
  `importctrl_message` text DEFAULT NULL COMMENT 'Mensagem ou resumo da última mudança de status (ex.: contagem de linhas, erros, etc.)',
  `importctrl_started` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Data/hora em que a importação foi iniciada (ou agendada)',
  `importctrl_ended` datetime DEFAULT NULL COMMENT 'Data/hora em que a importação foi finalizada (sucesso ou falha)',
  `importctrl_started_by` varchar(100) DEFAULT NULL COMMENT 'Identificação de quem iniciou a importação (user_id, login, etc.)',
  PRIMARY KEY (`importctrl_id`),
  KEY `idx_importctrl_source_file` (`importctrl_source`,`importctrl_file`),
  KEY `idx_importctrl_status` (`importctrl_status`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci COMMENT='Tabela de controle de execução de importações por arquivo (status global do processamento)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbImportLog`
--

DROP TABLE IF EXISTS `tbImportLog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbImportLog` (
  `importlog_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Identificador único do registro de log de importação',
  `importlog_source` varchar(50) NOT NULL COMMENT 'Origem da importação, por exemplo: CiscoSubscriptionCCW, ContractsCSV, etc.',
  `importlog_file` varchar(255) NOT NULL COMMENT 'Nome ou caminho do arquivo de origem (XLSX, CSV etc.)',
  `importlog_row` int(11) NOT NULL COMMENT 'Número da linha (após o cabeçalho) no arquivo de origem',
  `importlog_column` varchar(255) DEFAULT NULL COMMENT 'Nome do cabeçalho da coluna ou índice da coluna onde ocorreu o problema',
  `importlog_value` varchar(1000) DEFAULT NULL COMMENT 'Valor da célula associado ao problema (como texto)',
  `importlog_message` text NOT NULL COMMENT 'Mensagem detalhada sobre o erro ou observação da linha/célula',
  `importlog_created` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Data/hora em que o registro de log foi criado',
  `importlog_resolved` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0 = pendente, 1 = tratado',
  `importlog_resolved_at` datetime DEFAULT NULL COMMENT 'Data/hora em que o log foi marcado como tratado',
  `importlog_resolved_by` varchar(100) DEFAULT NULL COMMENT 'Quem marcou como tratado (login, usuário, etc.)',
  `importlog_resolution_note` text DEFAULT NULL COMMENT 'Observações sobre o tratamento/correção do problema',
  PRIMARY KEY (`importlog_id`),
  KEY `idx_importlog_source_file_row` (`importlog_source`,`importlog_file`,`importlog_row`),
  KEY `idx_importlog_column` (`importlog_column`),
  KEY `idx_importlog_resolved` (`importlog_resolved`)
) ENGINE=InnoDB AUTO_INCREMENT=697 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci COMMENT='Log de erros/ocorrências por linha e coluna em processos de importação, com referência ao valor da célula.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbImportXLS`
--

DROP TABLE IF EXISTS `tbImportXLS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbImportXLS` (
  `importxls_id` int(11) NOT NULL AUTO_INCREMENT,
  `importxls_type` varchar(20) DEFAULT NULL,
  `importxls_from` varchar(10) DEFAULT NULL,
  `importxls_vendor_id` int(11) DEFAULT NULL,
  `importxls_report_name` varchar(50) DEFAULT NULL,
  `importxls_used_by` varchar(50) DEFAULT NULL,
  `importxls_run_script` varchar(40) DEFAULT NULL,
  `importxls_vba_code` text DEFAULT NULL,
  `importxls_enabled` bit(1) DEFAULT NULL,
  `importxls_remark` mediumtext DEFAULT NULL,
  `importxls_created` date DEFAULT curdate(),
  PRIMARY KEY (`importxls_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbMeasureHistory`
--

DROP TABLE IF EXISTS `tbMeasureHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbMeasureHistory` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `history_alias_id` int(11) NOT NULL DEFAULT 0,
  `history_request_id` int(11) NOT NULL DEFAULT 0,
  `history_inventory_id` int(11) NOT NULL DEFAULT 0,
  `history_issue_id` int(11) NOT NULL DEFAULT 0,
  `history_date` datetime NOT NULL DEFAULT current_timestamp(),
  `history_remark` text DEFAULT NULL,
  `history_next_followup` date DEFAULT NULL,
  `history_updated_by` varchar(100) DEFAULT NULL,
  `history_status_id` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`history_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbMeasureRequest`
--

DROP TABLE IF EXISTS `tbMeasureRequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbMeasureRequest` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_client_id` int(11) NOT NULL DEFAULT 0,
  `request_project_id` int(11) DEFAULT 0,
  `request_client_contract_num` varchar(20) DEFAULT '-',
  `request_client_po` varchar(20) DEFAULT '0',
  `request_client_po_date` date DEFAULT NULL,
  `request_ntt_contract_num` varchar(20) DEFAULT '-',
  `request_ntt_po` varchar(20) DEFAULT '0',
  `request_ntt_ov` varchar(20) DEFAULT '0',
  `request_vendor_contract_num` varchar(20) DEFAULT '-',
  `request_vendor_po` varchar(20) DEFAULT '0',
  `request_client_item` varchar(20) DEFAULT '0',
  `request_client_demand` varchar(40) DEFAULT '-',
  `request_requested_by` varchar(255) DEFAULT '-',
  `request_client_occurence_record` varchar(80) DEFAULT NULL,
  `request_product_alias_id` int(11) DEFAULT 0,
  `request_qty` int(11) DEFAULT 0,
  `request_client_delivery_site` varchar(150) DEFAULT '-',
  `request_estimated_delivery_date` date DEFAULT NULL,
  `request_status_id` int(11) NOT NULL DEFAULT 2,
  PRIMARY KEY (`request_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbMinute`
--

DROP TABLE IF EXISTS `tbMinute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbMinute` (
  `minute_id` int(11) NOT NULL AUTO_INCREMENT,
  `minute_customer_id` int(11) NOT NULL DEFAULT 0,
  `minute_project_id` int(11) NOT NULL DEFAULT 0,
  `minute_task_id` int(11) NOT NULL DEFAULT 0,
  `minute_activity_id` int(11) NOT NULL DEFAULT 0,
  `minute_version` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '0',
  `minute_type_meeting` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `minute_date` date DEFAULT NULL,
  `minute_time` time DEFAULT NULL,
  `minute_local` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  PRIMARY KEY (`minute_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbMinuteParticipants`
--

DROP TABLE IF EXISTS `tbMinuteParticipants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbMinuteParticipants` (
  `participant_id` int(11) NOT NULL AUTO_INCREMENT,
  `participant_minute_id` int(11) DEFAULT NULL,
  `participant_contact_name` varchar(250) NOT NULL,
  `participant_contact_company` varchar(255) DEFAULT NULL,
  `participant_present` bit(1) DEFAULT NULL,
  `participant_justifications` bit(1) DEFAULT NULL,
  `participant_absent` bit(1) DEFAULT NULL,
  `participant_distribution` bit(1) DEFAULT NULL,
  PRIMARY KEY (`participant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbMinuteTopics`
--

DROP TABLE IF EXISTS `tbMinuteTopics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbMinuteTopics` (
  `topic_id` int(11) NOT NULL AUTO_INCREMENT,
  `topic_minute_id` int(11) NOT NULL DEFAULT 0,
  `topic_title` varchar(150) NOT NULL,
  `topic_description` text NOT NULL,
  `topic_who` varchar(255) DEFAULT NULL,
  `topic_when` date DEFAULT NULL,
  PRIMARY KEY (`topic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbNPS`
--

DROP TABLE IF EXISTS `tbNPS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbNPS` (
  `nps_id` int(11) NOT NULL AUTO_INCREMENT,
  `nps_company_id` int(11) NOT NULL DEFAULT 0,
  `nps_company_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `nps_shipping_date` date DEFAULT NULL,
  `nps_quarantine` int(11) DEFAULT NULL,
  `nps_next_shipping_date` date DEFAULT NULL,
  `nps_survey_id` int(11) DEFAULT NULL,
  `nps_response_date` date DEFAULT NULL,
  `nps_survey_version` varchar(100) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT 'Client Success',
  `nps_segment` varchar(150) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `nps_survey_score` varchar(10) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `nps_reason_score` text CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  PRIMARY KEY (`nps_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbNotaFiscal`
--

DROP TABLE IF EXISTS `tbNotaFiscal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbNotaFiscal` (
  `notafiscal_id` int(11) NOT NULL AUTO_INCREMENT,
  `notafiscal_num` int(11) DEFAULT NULL,
  `notafiscal_serie` int(11) DEFAULT NULL,
  `notafiscal_tipo` int(11) DEFAULT NULL,
  `notafiscal_customer_id` int(11) DEFAULT 0,
  `notafiscal_customer` int(11) DEFAULT NULL,
  `notafiscal_vendor` int(11) DEFAULT NULL,
  `notafiscal_date` datetime DEFAULT NULL,
  `notafiscal_key` varchar(150) DEFAULT NULL,
  `notafiscal_natureza` varchar(255) DEFAULT NULL,
  `notafiscal_status` varchar(150) DEFAULT NULL,
  `notafiscal_razaosocial_dest` varchar(80) DEFAULT NULL,
  `notafiscal_cnpj_dest` varchar(20) DEFAULT NULL,
  `notafiscal_ie_dest` varchar(15) DEFAULT NULL,
  `notafiscal_address_dest` varchar(255) DEFAULT NULL,
  `notafiscal_city_dest` varchar(100) DEFAULT NULL,
  `notafiscal_state_dest` varchar(50) DEFAULT NULL,
  `notafiscal_zipcode_dest` varchar(20) DEFAULT NULL,
  `notafiscal_country_dest` varchar(50) DEFAULT NULL,
  `notafiscal_neighborhood_dest` varchar(50) DEFAULT NULL,
  `notafiscal_complement_dest` varchar(255) DEFAULT NULL,
  `notafiscal_razaosocial_emissor` varchar(80) DEFAULT NULL,
  `notafiscal_cnpj_emissor` varchar(20) DEFAULT NULL,
  `notafiscal_ie_emissor` varchar(15) DEFAULT NULL,
  `notafiscal_address_emissor` varchar(255) DEFAULT NULL,
  `notafiscal_city_emissor` varchar(100) DEFAULT NULL,
  `notafiscal_state_emissor` varchar(50) DEFAULT NULL,
  `notafiscal_zipcode_emissor` varchar(20) DEFAULT NULL,
  `notafiscal_country_emissor` varchar(50) DEFAULT NULL,
  `notafiscal_neighborhood_emissor` varchar(50) DEFAULT NULL,
  `notafiscal_complement_emissor` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`notafiscal_id`),
  KEY `tbNotaFiscal_notafiscal_num_IDX` (`notafiscal_num`,`notafiscal_serie`,`notafiscal_tipo`,`notafiscal_customer`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=65108 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbNotaFiscalAsset`
--

DROP TABLE IF EXISTS `tbNotaFiscalAsset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbNotaFiscalAsset` (
  `nfasset_id` int(11) NOT NULL AUTO_INCREMENT,
  `nfasset_notafiscal_id` int(11) DEFAULT NULL,
  `nfasset_asset_id` int(11) DEFAULT 0,
  `nfasset_price` decimal(18,4) DEFAULT NULL,
  `nfasset_ov` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`nfasset_id`),
  UNIQUE KEY `tbnfasset_nfasset_notafiscal_id_IDX` (`nfasset_notafiscal_id`,`nfasset_asset_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=365623 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbOpportunity`
--

DROP TABLE IF EXISTS `tbOpportunity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbOpportunity` (
  `opportunity_id` int(11) NOT NULL AUTO_INCREMENT,
  `opportunity_num` varchar(25) NOT NULL,
  `opportunity_owner_id` int(11) DEFAULT 0,
  `opportunity_owner_name` varchar(255) DEFAULT NULL,
  `opportunity_name` varchar(255) DEFAULT NULL,
  `opportunity_customer_id` int(11) DEFAULT 0,
  `opportunity_account_name` varchar(255) DEFAULT NULL,
  `opportunity_stage` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `opportunity_currency` varchar(3) DEFAULT 'USD',
  `opportunity_amount` double DEFAULT 0,
  `opportunity_total_gp` double DEFAULT 0,
  `opportunity_create_date` date DEFAULT NULL,
  `opportunity_close_date` date DEFAULT NULL,
  `opportunity_product_family` varchar(20) DEFAULT NULL,
  `opportunity_product_description` text DEFAULT NULL,
  `opportunity_primary_campaign_source` varchar(255) DEFAULT NULL,
  `opportunity_global_vendor_id` int(11) DEFAULT 0,
  `opportunity_global_vendor` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`opportunity_id`),
  KEY `tbOpportunity_opportunity_num_IDX` (`opportunity_num`,`opportunity_name`,`opportunity_customer_id`,`opportunity_product_family`,`opportunity_global_vendor_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=17402 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProduct`
--

DROP TABLE IF EXISTS `tbProduct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProduct` (
  `product_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_manufacturer_id` int(11) NOT NULL DEFAULT 0,
  `product_manufacturer_name` varchar(150) DEFAULT NULL,
  `product_vendor_id` int(11) DEFAULT 0,
  `product_name` varchar(150) DEFAULT NULL,
  `product_part_number` varchar(150) DEFAULT NULL,
  `product_family` varchar(100) DEFAULT NULL,
  `product_subfamily` varchar(100) DEFAULT NULL,
  `product_group` varchar(100) DEFAULT NULL,
  `product_subtype` varchar(100) DEFAULT NULL,
  `product_type` varchar(80) DEFAULT NULL,
  `product_business_entity` varchar(150) DEFAULT NULL,
  `product_subbusiness_entity` varchar(150) DEFAULT NULL,
  `product_description` mediumtext DEFAULT NULL,
  `product_endofsupport` date DEFAULT NULL,
  `product_endofsoftwaremaintenance` date DEFAULT NULL,
  `product_endofsale` date DEFAULT NULL,
  `product_endoflifeannouncement` date DEFAULT NULL,
  `product_bulletin` text DEFAULT NULL,
  `product_pid_mapping_group` varchar(100) DEFAULT NULL,
  `product_endofroutinefailureanalysis` date DEFAULT NULL,
  `product_endofvulnerabilitysecuritysupport` date DEFAULT NULL,
  `product_remark` text DEFAULT NULL,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `tbProduct_product_vendor_id_IDX` (`product_vendor_id`,`product_name`) USING BTREE,
  KEY `idx_tbProduct_name` (`product_name`),
  KEY `idx_tbProduct_vendor` (`product_id`,`product_vendor_id`,`product_business_entity`,`product_subbusiness_entity`)
) ENGINE=InnoDB AUTO_INCREMENT=70840 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`pegasus`@`%`*/ /*!50003 TRIGGER tr_CleanProductDates_Insert
BEFORE INSERT ON tbProduct
FOR EACH ROW
BEGIN
    -- Proteção para End of Support
    IF NEW.product_endofsupport < '1920-01-01' THEN
        SET NEW.product_endofsupport = NULL;
    END IF;

    -- Proteção para Software Maintenance
    IF NEW.product_endofsoftwaremaintenance < '1920-01-01' THEN
        SET NEW.product_endofsoftwaremaintenance = NULL;
    END IF;

    -- Proteção para End of Sale
    IF NEW.product_endofsale < '1920-01-01' THEN
        SET NEW.product_endofsale = NULL;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`pegasus`@`%`*/ /*!50003 TRIGGER tr_CleanProductDates_Update
BEFORE UPDATE ON tbProduct
FOR EACH ROW
BEGIN
    IF NEW.product_endofsupport < '1920-01-01' THEN
        SET NEW.product_endofsupport = NULL;
    END IF;

    IF NEW.product_endofsoftwaremaintenance < '1920-01-01' THEN
        SET NEW.product_endofsoftwaremaintenance = NULL;
    END IF;

    IF NEW.product_endofsale < '1920-01-01' THEN
        SET NEW.product_endofsale = NULL;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tbProductAlias`
--

DROP TABLE IF EXISTS `tbProductAlias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProductAlias` (
  `productalias_id` int(11) NOT NULL AUTO_INCREMENT,
  `productalias_customer_id` int(11) NOT NULL DEFAULT 0,
  `productalias_product_id` int(11) NOT NULL DEFAULT 0,
  `productalias_name` varchar(80) NOT NULL,
  `productalias_contract_id` int(11) DEFAULT 0,
  `productalias_nm_contracted` int(11) DEFAULT 0,
  `productalias_created_at` date DEFAULT curdate(),
  `productalias_updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `productalias_remark` text DEFAULT NULL,
  PRIMARY KEY (`productalias_id`),
  UNIQUE KEY `tbMeasureProductAlias_alias_client_id_IDX` (`productalias_customer_id`,`productalias_product_id`,`productalias_name`,`productalias_contract_id`,`productalias_nm_contracted`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProject`
--

DROP TABLE IF EXISTS `tbProject`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProject` (
  `project_id` int(11) NOT NULL AUTO_INCREMENT,
  `project_ov` varchar(150) DEFAULT NULL,
  `project_owner` varchar(80) DEFAULT 'PMO',
  `project_customer_id` int(11) NOT NULL DEFAULT 0,
  `project_customer_name` varchar(255) DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  `project_internalization_date` date DEFAULT NULL,
  `project_start_date` date DEFAULT NULL,
  `project_end_date` date DEFAULT NULL,
  `project_status` varchar(30) DEFAULT NULL,
  `project_description` mediumtext DEFAULT NULL,
  `project_scope` text DEFAULT NULL,
  `project_objectives` text DEFAULT NULL,
  `project_current_scenario` text DEFAULT NULL,
  `project_key_feature_products` text DEFAULT NULL,
  `project_justification` text DEFAULT NULL,
  `project_remark` text DEFAULT NULL,
  `project_methodology` varchar(50) DEFAULT NULL,
  `project_action` varchar(50) DEFAULT NULL,
  `project_sprint_timebox` int(11) DEFAULT 0,
  `project_currency` varchar(3) DEFAULT 'BRL',
  `project_total_amount` decimal(18,2) DEFAULT 0.00,
  `project_total_amount_brl` decimal(18,2) DEFAULT 0.00,
  `project_planned_cost_subcontract_brl` decimal(18,2) DEFAULT 0.00,
  `project_planned_cost_subcontract_po_brl` decimal(18,2) DEFAULT 0.00,
  `project_planned_cost_pct_brl` decimal(18,2) DEFAULT 0.00,
  `project_planned_cost_brl` decimal(18,2) DEFAULT 0.00,
  `project_cost_final_value_brl` decimal(18,2) DEFAULT 0.00,
  PRIMARY KEY (`project_id`),
  KEY `tbProject_project_ov_IDX` (`project_ov`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=4873 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectHourEstimated`
--

DROP TABLE IF EXISTS `tbProjectHourEstimated`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectHourEstimated` (
  `houre_id` int(11) NOT NULL AUTO_INCREMENT,
  `houre_department_id` int(11) DEFAULT NULL,
  `houre_level_id` int(11) DEFAULT NULL,
  `houre_project_id` int(11) DEFAULT NULL,
  `houre_pct` varchar(150) DEFAULT NULL,
  `houre_hour` decimal(18,4) DEFAULT NULL,
  `houre_hour_cost` decimal(18,4) DEFAULT NULL,
  `houre_after` decimal(18,4) DEFAULT NULL,
  `houre_after_cost` decimal(18,4) DEFAULT NULL,
  `houre_enabled` tinyint(4) NOT NULL DEFAULT -1,
  PRIMARY KEY (`houre_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1066 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectHourPerformed`
--

DROP TABLE IF EXISTS `tbProjectHourPerformed`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectHourPerformed` (
  `hourp_id` int(11) NOT NULL AUTO_INCREMENT,
  `hourp_project_id` int(11) DEFAULT NULL,
  `hourp_date` datetime DEFAULT NULL,
  `hourp_user_id` int(11) DEFAULT NULL,
  `hourp_hour` decimal(18,0) DEFAULT NULL,
  `hourp_after` decimal(18,0) DEFAULT NULL,
  PRIMARY KEY (`hourp_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectNameFluig`
--

DROP TABLE IF EXISTS `tbProjectNameFluig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectNameFluig` (
  `projectfluig_id` int(11) NOT NULL AUTO_INCREMENT,
  `projectfluig_project_id` int(11) DEFAULT NULL,
  `projectfluig_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`projectfluig_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectOV`
--

DROP TABLE IF EXISTS `tbProjectOV`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectOV` (
  `ov_id` int(11) NOT NULL AUTO_INCREMENT,
  `ov_project_id` int(11) NOT NULL DEFAULT 0,
  `ov_project_ov` varchar(20) NOT NULL,
  PRIMARY KEY (`ov_id`),
  UNIQUE KEY `tbProjectOV_ov_project_id_IDX` (`ov_project_id`,`ov_project_ov`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3620 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectProgressBaseline`
--

DROP TABLE IF EXISTS `tbProjectProgressBaseline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectProgressBaseline` (
  `progress_id` int(11) NOT NULL AUTO_INCREMENT,
  `progress_project_id` int(11) DEFAULT NULL,
  `progress_baseline` int(11) DEFAULT NULL,
  `progress_updated` datetime DEFAULT NULL,
  `progress_month` int(11) DEFAULT NULL,
  `progress_year` int(11) DEFAULT NULL,
  `progress_value` decimal(18,4) DEFAULT NULL,
  PRIMARY KEY (`progress_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectSchedule`
--

DROP TABLE IF EXISTS `tbProjectSchedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectSchedule` (
  `ps_id` int(11) NOT NULL AUTO_INCREMENT,
  `ps_project_id` int(11) NOT NULL,
  `ps_line_id` int(11) NOT NULL DEFAULT 0,
  `ps_packet_task` varchar(1) NOT NULL DEFAULT 'T' COMMENT 'T (Task) or P (Packet)',
  `ps_outline_parent` varchar(100) DEFAULT '0' COMMENT 'Outline Parent (MS Project) - identifica a tarefa pai',
  `ps_outline_level` int(11) DEFAULT 0 COMMENT 'OutlineLevel (MS Project) - identifica no nível da tarefa',
  `ps_outline_number` varchar(10) DEFAULT '0' COMMENT 'Outline Number (MS Project): posição da tarefa dentro da estrutura de tópicos ou árvore de tarefas do projeto.',
  `ps_task_name` varchar(150) NOT NULL,
  `ps_predecessor` varchar(50) DEFAULT NULL,
  `ps_start_date` date DEFAULT NULL,
  `ps_end_date` date DEFAULT NULL,
  `ps_completed` decimal(6,4) DEFAULT 0.0000,
  `ps_duration` int(11) DEFAULT 0,
  `ps_effort` decimal(8,2) DEFAULT 0.00,
  `ps_resource` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ps_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectScheduleBaseline`
--

DROP TABLE IF EXISTS `tbProjectScheduleBaseline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectScheduleBaseline` (
  `psb_id` int(11) NOT NULL AUTO_INCREMENT,
  `psb_ps_id` int(11) NOT NULL,
  `psb_version` int(11) NOT NULL DEFAULT 0,
  `psb_start_date` date DEFAULT NULL,
  `psb_end_date` date DEFAULT NULL,
  `psb_duration` int(11) DEFAULT 0,
  `psb_effort` decimal(8,2) DEFAULT 0.00,
  `psb_remark` text DEFAULT NULL,
  PRIMARY KEY (`psb_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectTeam`
--

DROP TABLE IF EXISTS `tbProjectTeam`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectTeam` (
  `projteam_id` int(11) NOT NULL AUTO_INCREMENT,
  `projteam_project_id` int(11) DEFAULT NULL,
  `projteam_user_id` int(11) DEFAULT NULL,
  `projteam_department_id` int(11) DEFAULT NULL,
  `projteam_level_id` int(11) DEFAULT NULL,
  `projteam_technical_lead` tinyint(1) DEFAULT 0,
  `projteam_working_time` int(11) DEFAULT NULL,
  `projteam_allocation_start` date DEFAULT NULL,
  `projteam_allocation_end` date DEFAULT NULL,
  PRIMARY KEY (`projteam_id`),
  KEY `tbProjectTeam_projteam_project_id_IDX` (`projteam_project_id`,`projteam_user_id`,`projteam_department_id`,`projteam_level_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=12484 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbProjectType`
--

DROP TABLE IF EXISTS `tbProjectType`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbProjectType` (
  `projecttp_id` int(11) NOT NULL AUTO_INCREMENT,
  `projecttp_project_id` int(11) DEFAULT NULL,
  `projecttp_type` varchar(25) DEFAULT NULL,
  PRIMARY KEY (`projecttp_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3042 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbPurchase`
--

DROP TABLE IF EXISTS `tbPurchase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbPurchase` (
  `purchase_id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_from_vendor` tinyint(1) NOT NULL DEFAULT 0,
  `purchase_vendor_id` int(11) NOT NULL DEFAULT 0,
  `purchase_vendor_name` varchar(150) DEFAULT NULL,
  `purchase_vendor_type` varchar(15) DEFAULT NULL,
  `purchase_partner_id` int(11) NOT NULL DEFAULT 0,
  `purchase_partner_name` varchar(150) DEFAULT NULL,
  `purchase_product_id` int(11) NOT NULL DEFAULT 0,
  `purchase_customer_id` int(11) NOT NULL DEFAULT 0,
  `purchase_customer_name` varchar(150) DEFAULT NULL,
  `purchase_oracle_line_num` int(11) DEFAULT NULL,
  `purchase_web_order_id` varchar(50) DEFAULT NULL,
  `purchase_so_ntt` varchar(50) DEFAULT NULL,
  `purchase_so_vendor` varchar(50) DEFAULT NULL,
  `purchase_po` varchar(50) DEFAULT NULL,
  `purchase_deal_id` varchar(100) DEFAULT NULL,
  `purchase_date_booked` datetime DEFAULT NULL,
  `purchase_date_ordered` datetime DEFAULT NULL,
  `purchase_contract_number` varchar(50) DEFAULT NULL,
  `purchase_contract_start` datetime DEFAULT NULL,
  `purchase_contract_end` datetime DEFAULT NULL,
  `purchase_currency` varchar(3) DEFAULT NULL,
  `purchase_rate` decimal(18,4) DEFAULT NULL,
  `purchase_price` decimal(18,4) DEFAULT NULL,
  `purchase_qty` decimal(18,4) DEFAULT NULL,
  `purchase_purchaser_name` varchar(150) DEFAULT NULL,
  `purchase_note_to_vendor` mediumtext DEFAULT NULL,
  `purchase_remark` mediumtext DEFAULT NULL,
  `purchase_invoice_number` varchar(150) DEFAULT NULL,
  `purchase_status` varchar(25) DEFAULT NULL,
  `purchase_direct_line_num` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`purchase_id`),
  KEY `tbPurchase_purchase_vendor_id_IDX` (`purchase_vendor_id`,`purchase_product_id`,`purchase_customer_id`,`purchase_po`,`purchase_price`,`purchase_qty`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=121851 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbQuarter`
--

DROP TABLE IF EXISTS `tbQuarter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbQuarter` (
  `quarter_id` int(11) NOT NULL,
  `quarter_name` varchar(2) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `quarter_month_en_us` varchar(10) DEFAULT NULL,
  `quarter_month_es_es` varchar(10) DEFAULT NULL,
  `quarter_month_pt_br` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`quarter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbRateCard`
--

DROP TABLE IF EXISTS `tbRateCard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbRateCard` (
  `ratecard_id` int(11) NOT NULL AUTO_INCREMENT,
  `ratecard_level` varchar(3) DEFAULT NULL,
  `ratecard_hour_revenue` decimal(18,2) DEFAULT NULL,
  `ratecard_afterhour_revenue` decimal(18,2) DEFAULT NULL,
  `ratecard_hour_expense` decimal(18,2) DEFAULT NULL,
  `ratecard_afterhour_expense` decimal(18,2) DEFAULT NULL,
  `ratecard_fiscalyear` int(11) DEFAULT NULL,
  `ratecard_remark` mediumtext DEFAULT NULL,
  PRIMARY KEY (`ratecard_id`),
  KEY `tbRateCard_ratecard_level_IDX` (`ratecard_level`,`ratecard_fiscalyear`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbResourceLevel`
--

DROP TABLE IF EXISTS `tbResourceLevel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbResourceLevel` (
  `level_id` int(11) NOT NULL AUTO_INCREMENT,
  `level_name` varchar(50) DEFAULT NULL,
  `level_ratecard` varchar(3) DEFAULT NULL,
  `level_type` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`level_id`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbSquad`
--

DROP TABLE IF EXISTS `tbSquad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbSquad` (
  `squad_id` int(11) NOT NULL AUTO_INCREMENT,
  `squad_user_id` int(11) DEFAULT NULL,
  `squad_department_id` int(11) DEFAULT NULL,
  `squad_level_id` int(11) DEFAULT NULL,
  `squad_upgrade` date DEFAULT NULL,
  PRIMARY KEY (`squad_id`)
) ENGINE=InnoDB AUTO_INCREMENT=725 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbStakeholderManagement`
--

DROP TABLE IF EXISTS `tbStakeholderManagement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbStakeholderManagement` (
  `stakeholder_id` int(11) NOT NULL AUTO_INCREMENT,
  `stakeholder_user_id` int(11) NOT NULL DEFAULT 0,
  `stakeholder_company_id` int(11) NOT NULL DEFAULT 0,
  `stakeholder_project_id` int(11) NOT NULL DEFAULT 0,
  `stakeholder_essential_requirements` text DEFAULT NULL COMMENT 'Mandatory requirements requested by the customer that must be met.',
  `stakeholder_internal_external` varchar(8) NOT NULL DEFAULT 'INTERNAL' COMMENT 'Internal = from NTT; External = from another company',
  `stakeholder_key_expectations` text DEFAULT NULL COMMENT 'Key Expectations',
  `stakeholder_impact_potential` text DEFAULT NULL,
  `stakeholder_potential_reactions` text DEFAULT NULL,
  `stakeholder_power_in_the_company` int(11) NOT NULL DEFAULT 1 COMMENT 'Nível de autoridade; posição hierárquica ou de carisma ou liderança pessoal; 1-VERY LOW, 2-LOW, 3-MEDIUM, 4-HIGH, 5-VERY HIGH',
  `stakeholder_interest_level` int(11) NOT NULL DEFAULT 1 COMMENT 'Stakeholder interest level in the project or in the service; Level of concern regarding project or service outcomes; 1-VERY LOW, 2-LOW, 3-MEDIUM, 4-HIGH, 5-VERY HIGH',
  `stakeholder_attitude_towards` varchar(10) NOT NULL DEFAULT 'NEUTRAL' COMMENT 'Attitude towards the project/service: Supporter (Apoiador) - Supports the project; Neutral (Neutro) - Has knowledge of the project but remains neutral; Resistant (Resistente) - Would hinder the project if given the opportunity; Uninformed (Desinformado) - Has no information about the project, hence has no formed position; Champion (Lidera) - Engaged in ensuring the success of the project.',
  `stakeholder_strategy_to_gain` text DEFAULT NULL,
  `stakeholder_created_by` varchar(150) DEFAULT NULL,
  `stakeholder_updated_by` varchar(150) DEFAULT NULL,
  `stakeholder_updated_on` date DEFAULT NULL,
  `stakeholder_remark` text DEFAULT NULL,
  `stakeholder_enabled` tinyint(4) NOT NULL DEFAULT -1,
  PRIMARY KEY (`stakeholder_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbStatusType`
--

DROP TABLE IF EXISTS `tbStatusType`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbStatusType` (
  `statustype_id` int(11) NOT NULL AUTO_INCREMENT,
  `statustype_name` varchar(25) DEFAULT NULL,
  `statustype_name_es` varchar(25) DEFAULT NULL,
  `statustype_name_pt` varchar(25) DEFAULT NULL,
  `statustype_predecessor_id` varchar(100) DEFAULT NULL,
  `statustype_remark` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`statustype_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbStatusTypeJustification`
--

DROP TABLE IF EXISTS `tbStatusTypeJustification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbStatusTypeJustification` (
  `status_justification_id` int(11) NOT NULL AUTO_INCREMENT,
  `status_justification_status_id` int(11) NOT NULL,
  `status_justification_en` varchar(255) NOT NULL,
  `status_justification_pt` varchar(255) DEFAULT NULL,
  `status_justification_es` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`status_justification_id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbStatusTypeRenewal`
--

DROP TABLE IF EXISTS `tbStatusTypeRenewal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbStatusTypeRenewal` (
  `statustyperenewal_id` int(11) NOT NULL AUTO_INCREMENT,
  `statustyperenewal_phase` varchar(30) NOT NULL,
  `statustyperenewal_status` varchar(80) NOT NULL,
  `statustyperenewal_phase_pt` varchar(30) DEFAULT NULL,
  `statustyperenewal_phase_es` varchar(30) DEFAULT NULL,
  `statustyperenewal_status_pt` varchar(80) DEFAULT NULL,
  `statustyperenewal_status_es` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`statustyperenewal_id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbSubscriptionIgnored`
--

DROP TABLE IF EXISTS `tbSubscriptionIgnored`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbSubscriptionIgnored` (
  `subscriptionignored_id` int(11) NOT NULL AUTO_INCREMENT,
  `subscriptionignored_customer_id` int(11) DEFAULT 0,
  `subscriptionignored_number` varchar(20) NOT NULL,
  `subscriptionignored_reason` varchar(255) DEFAULT NULL,
  `subscriptionignored_add_by` varchar(50) DEFAULT NULL,
  `subscriptionignored_add_in` date DEFAULT curdate(),
  PRIMARY KEY (`subscriptionignored_id`),
  UNIQUE KEY `tbSubscriptionIgnored_subscriptionignored_customer_id_IDX` (`subscriptionignored_customer_id`,`subscriptionignored_number`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=405 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTask`
--

DROP TABLE IF EXISTS `tbTask`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTask` (
  `task_id` int(11) NOT NULL AUTO_INCREMENT,
  `task_tasktype_id` int(11) DEFAULT NULL,
  `task_reference` varchar(255) DEFAULT NULL,
  `task_owner_id` int(11) DEFAULT 0,
  `task_temp_owner_id` int(11) DEFAULT NULL,
  `task_customer_id` int(11) DEFAULT 0,
  `task_cr_party_id` varchar(100) DEFAULT '0',
  `task_cr_party_name` varchar(150) DEFAULT NULL,
  `task_customer_name` varchar(255) DEFAULT NULL,
  `task_created_in` datetime DEFAULT NULL,
  `task_created_by` int(11) DEFAULT 0,
  `task_priority` varchar(10) NOT NULL DEFAULT 'LOW',
  `task_project_id` int(11) DEFAULT 0,
  `task_status` int(11) NOT NULL DEFAULT 1,
  `task_status_justification` varchar(255) DEFAULT NULL,
  `task_start` date DEFAULT NULL,
  `task_end` date DEFAULT NULL,
  `task_start_performed` date DEFAULT NULL,
  `task_end_performed` date DEFAULT NULL,
  `task_value` decimal(30,6) DEFAULT 0.000000,
  `task_forecast` decimal(30,6) DEFAULT 0.000000,
  `task_backlog` decimal(30,6) DEFAULT 0.000000,
  `task_rate` decimal(6,4) DEFAULT 1.0000,
  `task_currency` varchar(3) DEFAULT 'USD',
  `task_ws` varchar(25) DEFAULT NULL,
  `task_deal_id` varchar(25) DEFAULT NULL,
  `task_track` text DEFAULT NULL,
  `task_subtrack` text DEFAULT NULL,
  `task_highlight` tinyint(1) DEFAULT 0,
  `task_remark` text DEFAULT NULL,
  `task_description` text DEFAULT NULL,
  `task_ea_flag` tinyint(1) NOT NULL DEFAULT 0,
  `task_telemetry_flag` tinyint(1) NOT NULL DEFAULT 0,
  `task_opt_in_flag` tinyint(1) NOT NULL DEFAULT 0,
  `task_completed` decimal(5,2) DEFAULT 0.00,
  `task_architecture` varchar(80) DEFAULT '-',
  `task_solution_domain` varchar(80) DEFAULT '-',
  `task_eligible` varchar(1) DEFAULT 'Y',
  `task_end_fy` int(4) DEFAULT NULL,
  `task_booking_date` date DEFAULT NULL,
  `task_booking_amount` decimal(30,6) DEFAULT 0.000000,
  PRIMARY KEY (`task_id`),
  KEY `tbTask_task_type_id_IDX` (`task_tasktype_id`,`task_reference`) USING BTREE,
  KEY `idx_task_owner_id` (`task_owner_id`),
  KEY `idx_task_temp_owner_id` (`task_temp_owner_id`),
  KEY `idx_task_customer_id` (`task_customer_id`),
  KEY `idx_task_project_id` (`task_project_id`),
  KEY `idx_task_status` (`task_status`),
  KEY `idx_tbTask_type_id_customer_ws` (`task_tasktype_id`,`task_id`,`task_customer_id`,`task_ws`)
) ENGINE=InnoDB AUTO_INCREMENT=6056 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskActivity`
--

DROP TABLE IF EXISTS `tbTaskActivity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskActivity` (
  `activity_id` int(11) NOT NULL AUTO_INCREMENT,
  `activity_task_id` int(11) DEFAULT NULL,
  `activity_seq` int(11) NOT NULL DEFAULT 1,
  `activity_name` varchar(255) DEFAULT NULL,
  `activity_objective` text DEFAULT NULL,
  `activity_scope` text DEFAULT NULL,
  `activity_expected_results` text DEFAULT NULL,
  `activity_effort` decimal(8,4) DEFAULT 0.0000,
  `activity_status` int(11) DEFAULT NULL,
  `activity_ws` varchar(25) DEFAULT NULL,
  `activity_deal_id` varchar(25) DEFAULT NULL,
  `activity_track` text DEFAULT NULL,
  `activity_sub_track` text DEFAULT NULL,
  `activity_value` decimal(20,6) DEFAULT NULL,
  `activity_currency` varchar(3) DEFAULT 'USD',
  `activity_start` date DEFAULT NULL,
  `activity_end` date DEFAULT NULL,
  `activity_start_performed` date DEFAULT NULL,
  `activity_end_performed` date DEFAULT NULL,
  `activity_effort_performed` decimal(8,4) DEFAULT 0.0000,
  `activity_completed` decimal(5,2) DEFAULT 0.00,
  `activity_approved` tinyint(1) DEFAULT 0,
  `activity_approved_value` decimal(20,6) DEFAULT 0.000000,
  `activity_approved_currency` varchar(3) DEFAULT 'USD',
  `activity_approval_date` date DEFAULT NULL,
  `activity_approval_request_date` date DEFAULT NULL,
  `activity_approval_fy` int(11) DEFAULT NULL,
  `activity_end_fy` int(11) DEFAULT NULL,
  `activity_backlog_value` decimal(10,4) DEFAULT 0.0000,
  PRIMARY KEY (`activity_id`),
  KEY `tbTaskActivity_activity_task_id_IDX` (`activity_task_id`,`activity_ws`,`activity_deal_id`) USING BTREE,
  KEY `idx_activity_task_id` (`activity_task_id`),
  KEY `idx_activity_status` (`activity_status`),
  KEY `idx_activity_task_currency_value` (`activity_task_id`,`activity_currency`,`activity_value`),
  KEY `idx_tbTaskActivity_task_status_endperf_id` (`activity_task_id`,`activity_status`,`activity_end_performed`,`activity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26306 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskActivityTemplate`
--

DROP TABLE IF EXISTS `tbTaskActivityTemplate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskActivityTemplate` (
  `activitytemplate_id` int(11) NOT NULL AUTO_INCREMENT,
  `activitytemplate_tasktype_id` int(11) DEFAULT NULL,
  `activitytemplate_architecture` varchar(100) DEFAULT NULL,
  `activitytemplate_solution` varchar(255) DEFAULT NULL,
  `activitytemplate_uc_id` int(11) DEFAULT NULL,
  `activitytemplate_use_case` varchar(255) DEFAULT NULL,
  `activitytemplate_seq` int(11) DEFAULT NULL,
  `activitytemplate_name` varchar(255) DEFAULT NULL,
  `activitytemplate_objective` text DEFAULT NULL,
  `activitytemplate_scope` text DEFAULT NULL,
  `activitytemplate_expected_results` text DEFAULT NULL,
  `activitytemplate_efford` int(11) DEFAULT 0,
  PRIMARY KEY (`activitytemplate_id`),
  KEY `tbTaskSubtask_subtask_task_id_IDX` (`activitytemplate_tasktype_id`,`activitytemplate_name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskAttachment`
--

DROP TABLE IF EXISTS `tbTaskAttachment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskAttachment` (
  `taskattachment_id` int(11) NOT NULL AUTO_INCREMENT,
  `taskattachment_task_id` int(11) DEFAULT 0,
  `taskattachment_activity_id` int(11) DEFAULT 0,
  `taskattachment_file_name` varchar(255) DEFAULT NULL,
  `taskattachment_remark` varchar(255) DEFAULT NULL,
  `taskattachment_file` longblob DEFAULT NULL,
  PRIMARY KEY (`taskattachment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskBaseline`
--

DROP TABLE IF EXISTS `tbTaskBaseline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskBaseline` (
  `taskbaseline_id` int(11) NOT NULL AUTO_INCREMENT,
  `taskbaseline_seq` int(11) NOT NULL DEFAULT 0,
  `taskbaseline_task_id` int(11) NOT NULL DEFAULT 0,
  `taskbaseline_start_date` datetime DEFAULT NULL,
  `taskbaseline_end_date` datetime DEFAULT NULL,
  `taskbaseline_value` decimal(10,4) DEFAULT NULL,
  `taskbaseline_justification` varchar(255) NOT NULL,
  `taskbaseline_changed_by` varchar(25) NOT NULL,
  `taskbaseline_change_date` date NOT NULL,
  PRIMARY KEY (`taskbaseline_id`),
  KEY `tbTaskBaseline_taskbaseline_seq_IDX` (`taskbaseline_seq`,`taskbaseline_task_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=548 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskChallenge`
--

DROP TABLE IF EXISTS `tbTaskChallenge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskChallenge` (
  `challenge_id` int(11) NOT NULL AUTO_INCREMENT,
  `challenge_task_id` int(11) NOT NULL DEFAULT 0,
  `challenge_whyischallenging` text DEFAULT NULL,
  `challenge_whatsuggestionstoovercomechallenge` text DEFAULT NULL,
  `challenge_additionalnotes` text DEFAULT NULL,
  PRIMARY KEY (`challenge_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskRACI`
--

DROP TABLE IF EXISTS `tbTaskRACI`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskRACI` (
  `taskraci_id` int(11) NOT NULL AUTO_INCREMENT,
  `taskraci_subtask_id` int(11) NOT NULL,
  `taskraci_stakeholder_id` int(11) NOT NULL DEFAULT 0,
  `taskraci_stakeholder_type` varchar(8) DEFAULT NULL,
  `taskraci_stakeholder_name` varchar(50) NOT NULL,
  `taskraci_responsibility` varchar(1) NOT NULL,
  `taskraci_enabled` tinyint(1) NOT NULL DEFAULT -1,
  `taskraci_disabled_by` varchar(25) DEFAULT NULL,
  `taskraci_disabled_date` date DEFAULT NULL,
  PRIMARY KEY (`taskraci_id`),
  KEY `tbTaskRACI_taskraci_subtask_id_IDX` (`taskraci_subtask_id`,`taskraci_stakeholder_id`,`taskraci_responsibility`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=580 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskRecord`
--

DROP TABLE IF EXISTS `tbTaskRecord`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskRecord` (
  `taskrecord_id` int(11) NOT NULL AUTO_INCREMENT,
  `taskrecord_task_id` int(11) DEFAULT 0,
  `taskrecord_activity_id` int(11) DEFAULT 0,
  `taskrecord_project_id` int(11) DEFAULT 0,
  `taskrecord_measure_request_id` int(11) DEFAULT 0,
  `taskrecord_date` datetime NOT NULL,
  `taskrecord_remark` mediumtext DEFAULT NULL,
  `taskrecord_next_followup` date DEFAULT NULL,
  `taskrecord_updated_by` varchar(25) DEFAULT NULL,
  `taskrecord_status` varchar(10) DEFAULT NULL COMMENT 'DOING, PENDING, DONE',
  `taskrecord_type` varchar(20) DEFAULT 'INFO' COMMENT 'INFO, ISSUE, BLOCKER',
  PRIMARY KEY (`taskrecord_id`),
  KEY `idx_taskrecord_task_followup` (`taskrecord_task_id`,`taskrecord_activity_id`,`taskrecord_next_followup`),
  KEY `idx_taskrecord_activity_followup` (`taskrecord_activity_id`,`taskrecord_next_followup`)
) ENGINE=InnoDB AUTO_INCREMENT=24544 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskSubtask`
--

DROP TABLE IF EXISTS `tbTaskSubtask`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskSubtask` (
  `subtask_id` int(11) NOT NULL AUTO_INCREMENT,
  `subtask_task_id` int(11) DEFAULT NULL,
  `subtask_name` varchar(255) DEFAULT NULL,
  `subtask_objective` varchar(255) DEFAULT NULL,
  `subtask_scope` varchar(255) DEFAULT NULL,
  `subtask_expected_results` varchar(255) DEFAULT NULL,
  `subtask_effort` decimal(3,2) DEFAULT NULL,
  `subtask_status` int(11) DEFAULT NULL,
  PRIMARY KEY (`subtask_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTaskType`
--

DROP TABLE IF EXISTS `tbTaskType`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTaskType` (
  `tasktype_id` int(11) NOT NULL AUTO_INCREMENT,
  `tasktype_name` varchar(150) DEFAULT NULL,
  `tasktype_incentive` tinyint(1) DEFAULT 0,
  `tasktype_adoption` tinyint(1) DEFAULT 0,
  `tasktype_for_team` varchar(20) DEFAULT NULL,
  `tasktype_critical_level` varchar(10) NOT NULL DEFAULT 'NONE' COMMENT 'valores: N1, N2, N3, NONE',
  `tasktype_critical_reason` varchar(255) DEFAULT NULL,
  `tasktype_finance_type` varchar(10) DEFAULT 'NEUTRAL' COMMENT '''valores: ''''REVENUE'''', ''''EXPENSE'''' ou ''''NEUTRAL'''',',
  `tasktype_is_service_impacting` tinyint(1) DEFAULT 0 COMMENT 'valores: 0=No, 1=Yes',
  PRIMARY KEY (`tasktype_id`),
  KEY `tbTaskType_tasktype_name_IDX` (`tasktype_name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTeamGoal`
--

DROP TABLE IF EXISTS `tbTeamGoal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTeamGoal` (
  `goal_id` int(11) NOT NULL AUTO_INCREMENT,
  `goal_fy` int(11) NOT NULL,
  `goal_name` varchar(255) NOT NULL,
  `goal_team_id` int(11) DEFAULT NULL,
  `goal_users_list` text DEFAULT NULL,
  `goal_tasks_list` text DEFAULT NULL,
  `goal_measurement_by_counting` tinyint(1) NOT NULL DEFAULT 0,
  `goal_measurement_by_sum` tinyint(1) NOT NULL DEFAULT 0,
  `goal_value` float NOT NULL DEFAULT 0,
  `goal_description` text DEFAULT NULL,
  `goal_point` int(11) DEFAULT 0,
  `goal_multiplier` tinyint(1) DEFAULT 0,
  `goal_individual` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`goal_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbTeamTarget`
--

DROP TABLE IF EXISTS `tbTeamTarget`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbTeamTarget` (
  `target_id` int(11) NOT NULL AUTO_INCREMENT,
  `target_fy` int(11) NOT NULL,
  `target_name` varchar(255) NOT NULL,
  `target_team_id` int(11) DEFAULT NULL,
  `target_users_list` text DEFAULT NULL,
  `target_tasks_list` text DEFAULT NULL,
  `target_measurement_by_counting` tinyint(1) NOT NULL DEFAULT 0,
  `target_measurement_by_sum` tinyint(1) NOT NULL DEFAULT 0,
  `target_value` float NOT NULL DEFAULT 0,
  `target_description` text DEFAULT NULL,
  `target_point` int(11) DEFAULT 0,
  `target_multiplier` tinyint(1) DEFAULT 0,
  `target_individual` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`target_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbUseCase`
--

DROP TABLE IF EXISTS `tbUseCase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbUseCase` (
  `uc_id` int(11) NOT NULL AUTO_INCREMENT,
  `uc_vendor_id` int(11) NOT NULL,
  `uc_architecture` varchar(100) DEFAULT NULL,
  `uc_solution_domain` varchar(100) DEFAULT NULL,
  `uc_track` varchar(100) DEFAULT NULL,
  `uc_use_case` varchar(150) NOT NULL,
  `uc_primary_product_id` int(11) DEFAULT 0,
  `uc_primary_product_name` varchar(150) DEFAULT NULL,
  `uc_key_supporting_products` text DEFAULT NULL,
  `uc_key_capabilities` text DEFAULT NULL,
  `uc_it_operations_benefits` text DEFAULT NULL,
  `uc_business_benefits` text DEFAULT NULL,
  `uc_success_metrics` text DEFAULT NULL,
  `uc_business_outcomes` text DEFAULT NULL,
  `uc_description` text DEFAULT NULL,
  `uc_update_date` datetime DEFAULT current_timestamp(),
  `uc_updated_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`uc_id`),
  UNIQUE KEY `tbUseCase_uc_company_id_IDX` (`uc_vendor_id`,`uc_use_case`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=160 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbUseCaseExitCriteria`
--

DROP TABLE IF EXISTS `tbUseCaseExitCriteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbUseCaseExitCriteria` (
  `ucec_id` int(11) NOT NULL AUTO_INCREMENT,
  `ucec_tasktype_id` int(11) DEFAULT NULL,
  `ucec_uc_id` int(11) DEFAULT NULL,
  `ucec_seq` int(11) DEFAULT NULL,
  `ucec_name` varchar(255) DEFAULT NULL,
  `ucec_objective` text DEFAULT NULL,
  `ucec_scope` text DEFAULT NULL,
  `ucec_expected_results` text DEFAULT NULL,
  `ucec_update_date` date DEFAULT current_timestamp(),
  `ucec_updated_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ucec_id`),
  KEY `tbUseCaseExitCriteria_ucec_name_IDX` (`ucec_tasktype_id`,`ucec_name`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=214 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbUser`
--

DROP TABLE IF EXISTS `tbUser`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbUser` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_name` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `user_full_name` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `user_alternative_name` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `user_telephone` varchar(25) DEFAULT NULL,
  `user_cellphone` varchar(15) DEFAULT NULL,
  `user_email` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `user_type` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `user_company_id` int(11) DEFAULT 0,
  `user_department` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `user_job_title` varchar(150) CHARACTER SET latin1 COLLATE latin1_swedish_ci DEFAULT NULL,
  `user_admin` tinyint(1) NOT NULL DEFAULT 0,
  `user_manager` tinyint(4) NOT NULL DEFAULT 0,
  `user_language` varchar(5) NOT NULL DEFAULT 'en-US',
  `user_password` varchar(255) DEFAULT NULL,
  `user_change_passwd` tinyint(4) NOT NULL DEFAULT 0,
  `user_hiring` date DEFAULT NULL,
  `user_termination` date DEFAULT NULL,
  `user_allow_import_xls` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_adoption_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_capacity_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_project_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_notafiscal_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_contract_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_iteminfo_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_technical_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_operational_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_panorama_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_vision_dash` tinyint(1) NOT NULL DEFAULT 0,
  `user_allow_renewal_dash` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `tbUser_user_name_IDX` (`user_name`,`user_email`,`user_company_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=910 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbUserGridPreferences`
--

DROP TABLE IF EXISTS `tbUserGridPreferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbUserGridPreferences` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `page_name` varchar(100) NOT NULL,
  `grid_name` varchar(100) NOT NULL,
  `columns_order` text DEFAULT NULL,
  `hidden_columns` text DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_page_grid` (`user_id`,`page_name`,`grid_name`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbUserListName`
--

DROP TABLE IF EXISTS `tbUserListName`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbUserListName` (
  `userlistname_user_id` int(11) DEFAULT NULL,
  `userlistname_user_name` varchar(150) DEFAULT NULL,
  `userlistname_id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`userlistname_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1288 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbUserLogin`
--

DROP TABLE IF EXISTS `tbUserLogin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbUserLogin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) DEFAULT NULL,
  `checkin` datetime DEFAULT NULL,
  `checkout` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2035 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbVBACode`
--

DROP TABLE IF EXISTS `tbVBACode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbVBACode` (
  `code_id` int(11) NOT NULL AUTO_INCREMENT,
  `code_name` varchar(100) NOT NULL,
  `code_purpose` varchar(255) DEFAULT NULL,
  `code_run` text NOT NULL,
  `code_created` date DEFAULT curdate(),
  PRIMARY KEY (`code_id`),
  UNIQUE KEY `tbVBACode_unique` (`code_name`)
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbVBACodeCalledBy`
--

DROP TABLE IF EXISTS `tbVBACodeCalledBy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbVBACodeCalledBy` (
  `calledby_id` int(11) NOT NULL AUTO_INCREMENT,
  `calledby_importxls_id` int(11) DEFAULT 0,
  `calledby_form_name` varchar(100) DEFAULT NULL,
  `calledby_code_id` int(11) DEFAULT 0,
  PRIMARY KEY (`calledby_id`),
  UNIQUE KEY `tbVBACodeCalledBy_calledby_importxls_id_IDX` (`calledby_importxls_id`,`calledby_form_name`,`calledby_code_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=153 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tbVersion`
--

DROP TABLE IF EXISTS `tbVersion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbVersion` (
  `version_id` int(11) NOT NULL AUTO_INCREMENT,
  `version_num` varchar(10) NOT NULL,
  `version_release_date` date DEFAULT NULL,
  `version_changed_by` varchar(20) DEFAULT NULL,
  `version_remark` text DEFAULT NULL,
  PRIMARY KEY (`version_id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary table structure for view `vwAccountTeam`
--

DROP TABLE IF EXISTS `vwAccountTeam`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeam`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeam` AS SELECT
 1 AS `accountteam_id`,
  1 AS `accountteam_company_id`,
  1 AS `accountteam_user_id`,
  1 AS `accountteam_user_type`,
  1 AS `accountteam_allocation_start_date`,
  1 AS `accountteam_allocation_end_date`,
  1 AS `accountteam_allocated`,
  1 AS `accountteam_changed_in`,
  1 AS `accountteam_changed_by`,
  1 AS `accountteam_user_name`,
  1 AS `accountteam_company_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamCSM`
--

DROP TABLE IF EXISTS `vwAccountTeamCSM`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamCSM`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamCSM` AS SELECT
 1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `client_id`,
  1 AS `client_name`,
  1 AS `am_id`,
  1 AS `am_name`,
  1 AS `CiscoEA`,
  1 AS `client_type` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamCSMCountByAM`
--

DROP TABLE IF EXISTS `vwAccountTeamCSMCountByAM`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamCSMCountByAM`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamCSMCountByAM` AS SELECT
 1 AS `am_id`,
  1 AS `am_name`,
  1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `count_csm` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamCiscoEANoCSM`
--

DROP TABLE IF EXISTS `vwAccountTeamCiscoEANoCSM`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamCiscoEANoCSM`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamCiscoEANoCSM` AS SELECT
 1 AS `company_id`,
  1 AS `company_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamCustomerScore`
--

DROP TABLE IF EXISTS `vwAccountTeamCustomerScore`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamCustomerScore`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamCustomerScore` AS SELECT
 1 AS `company_id`,
  1 AS `company_name`,
  1 AS `company_current_level`,
  1 AS `company_vertical`,
  1 AS `has_csm`,
  1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `has_cdm`,
  1 AS `cdm_id`,
  1 AS `cdm_name`,
  1 AS `am_id`,
  1 AS `am_name`,
  1 AS `dir_id`,
  1 AS `dir_name`,
  1 AS `total_active_mrr`,
  1 AS `customer_score`,
  1 AS `customer_level`,
  1 AS `opportunity_amount_total_12m`,
  1 AS `opportunity_amount_deal_lost_12m`,
  1 AS `opportunity_amount_identification_12m`,
  1 AS `opportunity_amount_finalist_12m`,
  1 AS `opportunity_amount_proposal_evaluation_12m`,
  1 AS `opportunity_amount_deal_won_12m`,
  1 AS `opportunity_amount_proposal_12m`,
  1 AS `opportunity_amount_qualification_12m`,
  1 AS `opportunity_amount_requirements_definition_12m` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamFrequentCSMperAM`
--

DROP TABLE IF EXISTS `vwAccountTeamFrequentCSMperAM`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamFrequentCSMperAM`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamFrequentCSMperAM` AS SELECT
 1 AS `am_id`,
  1 AS `am_name`,
  1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `occurrences`,
  1 AS `rank_pos` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamMostFrequentAMperCSM`
--

DROP TABLE IF EXISTS `vwAccountTeamMostFrequentAMperCSM`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentAMperCSM`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamMostFrequentAMperCSM` AS SELECT
 1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `am_id`,
  1 AS `am_name`,
  1 AS `occurrences` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamMostFrequentCSMperAM`
--

DROP TABLE IF EXISTS `vwAccountTeamMostFrequentCSMperAM`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentCSMperAM`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamMostFrequentCSMperAM` AS SELECT
 1 AS `am_id`,
  1 AS `am_name`,
  1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `occurrences` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamMostFrequentCSMperAMTop3`
--

DROP TABLE IF EXISTS `vwAccountTeamMostFrequentCSMperAMTop3`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentCSMperAMTop3`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamMostFrequentCSMperAMTop3` AS SELECT
 1 AS `am_id`,
  1 AS `am_name`,
  1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `occurrences`,
  1 AS `csm_rank_for_am` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamMostFrequentCSMperDIR`
--

DROP TABLE IF EXISTS `vwAccountTeamMostFrequentCSMperDIR`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentCSMperDIR`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamMostFrequentCSMperDIR` AS SELECT
 1 AS `dir_id`,
  1 AS `dir_name`,
  1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `occurrences` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAccountTeamMostFrequentCSMperDIRTop3`
--

DROP TABLE IF EXISTS `vwAccountTeamMostFrequentCSMperDIRTop3`;
/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentCSMperDIRTop3`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAccountTeamMostFrequentCSMperDIRTop3` AS SELECT
 1 AS `dir_id`,
  1 AS `dir_name`,
  1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `occurrences`,
  1 AS `csm_rank_for_dir` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAssetContractEndMismatch`
--

DROP TABLE IF EXISTS `vwAssetContractEndMismatch`;
/*!50001 DROP VIEW IF EXISTS `vwAssetContractEndMismatch`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAssetContractEndMismatch` AS SELECT
 1 AS `asset_id`,
  1 AS `asset_serial_number`,
  1 AS `asset_instance_number`,
  1 AS `asset_subscription_id`,
  1 AS `asset_parent_level`,
  1 AS `asset_parent_serial_number`,
  1 AS `asset_parent_instance_number`,
  1 AS `product_id`,
  1 AS `product_name`,
  1 AS `product_manufacturer_id`,
  1 AS `product_manufacturer_name`,
  1 AS `product_family`,
  1 AS `product_group`,
  1 AS `vendorasset_contract_num`,
  1 AS `vendorasset_customer_id`,
  1 AS `vendorasset_customer_name`,
  1 AS `nttasset_contract_number`,
  1 AS `nttasset_customer_id`,
  1 AS `nttasset_customer_name`,
  1 AS `vendorasset_vendor_id`,
  1 AS `vendorasset_vendor_name`,
  1 AS `vendorasset_start`,
  1 AS `vendorasset_end`,
  1 AS `nttasset_contract_start`,
  1 AS `nttasset_contract_end`,
  1 AS `end_date_diff_days`,
  1 AS `start_date_diff_days`,
  1 AS `customer_mismatch_flag`,
  1 AS `status_consolidated`,
  1 AS `alert_reason`,
  1 AS `product_eos`,
  1 AS `product_ldos`,
  1 AS `eos_status`,
  1 AS `ldos_status` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAssetSnapshot`
--

DROP TABLE IF EXISTS `vwAssetSnapshot`;
/*!50001 DROP VIEW IF EXISTS `vwAssetSnapshot`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAssetSnapshot` AS SELECT
 1 AS `asset_id`,
  1 AS `product_part_number`,
  1 AS `product_id`,
  1 AS `product_manufacturer_name`,
  1 AS `product_endofsupport`,
  1 AS `company_id`,
  1 AS `company_name`,
  1 AS `site_id`,
  1 AS `site_name`,
  1 AS `last_tracking_id`,
  1 AS `last_tracking_operation`,
  1 AS `last_tracking_date`,
  1 AS `asset_serial_number`,
  1 AS `asset_instance_number`,
  1 AS `unit_value`,
  1 AS `days_since_last_op`,
  1 AS `is_idle_90d`,
  1 AS `nttasset_contract_number`,
  1 AS `reference_price`,
  1 AS `avg_lead_days`,
  1 AS `snapshot_key`,
  1 AS `deployment_id`,
  1 AS `deployment_status`,
  1 AS `deployment_environment`,
  1 AS `deployment_hostname`,
  1 AS `deployment_mgmt_ip`,
  1 AS `deployment_vip_ip`,
  1 AS `deployment_is_shared_mgmt_ip`,
  1 AS `deployment_is_shared_vip_ip`,
  1 AS `deployment_group_type`,
  1 AS `deployment_group_key`,
  1 AS `deployment_role`,
  1 AS `deployment_parent_asset_id`,
  1 AS `deployment_member_index`,
  1 AS `deployment_slot`,
  1 AS `deployment_port`,
  1 AS `deployment_installed_at`,
  1 AS `deployment_in_production_at`,
  1 AS `deployment_retired_at` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwAssetTracking`
--

DROP TABLE IF EXISTS `vwAssetTracking`;
/*!50001 DROP VIEW IF EXISTS `vwAssetTracking`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwAssetTracking` AS SELECT
 1 AS `tracking_id`,
  1 AS `tracking_company_id`,
  1 AS `tracking_company_name`,
  1 AS `tracking_site_id`,
  1 AS `tracking_site_name`,
  1 AS `tracking_asset_id`,
  1 AS `tracking_product_id`,
  1 AS `tracking_product_part_number`,
  1 AS `tracking_ov`,
  1 AS `tracking_nf`,
  1 AS `tracking_asset_serial_number`,
  1 AS `tracking_asset_instance_number`,
  1 AS `tracking_operation`,
  1 AS `tracking_operation_by`,
  1 AS `tracking_operation_date`,
  1 AS `tracking_remark` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoEAConsumptionSummary`
--

DROP TABLE IF EXISTS `vwCiscoEAConsumptionSummary`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoEAConsumptionSummary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoEAConsumptionSummary` AS SELECT
 1 AS `mcea_client_id`,
  1 AS `mcea_domain`,
  1 AS `mcea_virtual_account`,
  1 AS `mcea_sku`,
  1 AS `mcea_purchased`,
  1 AS `mcea_growth_allowance`,
  1 AS `mcea_total_purchased`,
  1 AS `mcea_generated`,
  1 AS `mcea_percentage_generated_purchased`,
  1 AS `mcea_percentage_generated_total_purchased`,
  1 AS `mcea_purchased_sum`,
  1 AS `mcea_growth_allowance_sum`,
  1 AS `mcea_total_purchased_sum`,
  1 AS `mcea_generated_sum`,
  1 AS `mcea_percentage_puchased_puchased_sum`,
  1 AS `mcea_percentage_puchased_total_puchased_sum`,
  1 AS `mcea_percentage_generated_generated_sum`,
  1 AS `mcea_percentage_generated_total_purchased_sum` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoEACustomerWebOrder`
--

DROP TABLE IF EXISTS `vwCiscoEACustomerWebOrder`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoEACustomerWebOrder`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoEACustomerWebOrder` AS SELECT
 1 AS `ea_web_order_id`,
  1 AS `ea_end_customer_id` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoEAEndDateNearlyExpire`
--

DROP TABLE IF EXISTS `vwCiscoEAEndDateNearlyExpire`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoEAEndDateNearlyExpire`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoEAEndDateNearlyExpire` AS SELECT
 1 AS `ea_id`,
  1 AS `ea_end_customer`,
  1 AS `ea_product_id`,
  1 AS `ea_end_date`,
  1 AS `ea_subscription_id`,
  1 AS `ea_end_date_task_id`,
  1 AS `ea_csm_id` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoEAMeteringHistory`
--

DROP TABLE IF EXISTS `vwCiscoEAMeteringHistory`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoEAMeteringHistory`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoEAMeteringHistory` AS SELECT
 1 AS `mcea_id`,
  1 AS `mcea_client_id`,
  1 AS `mcea_client`,
  1 AS `mcea_domain`,
  1 AS `mcea_virtual_account`,
  1 AS `mcea_subscription`,
  1 AS `mcea_ntf_date`,
  1 AS `mcea_status`,
  1 AS `mcea_start_date`,
  1 AS `mcea_end_date`,
  1 AS `mcea_suite_name`,
  1 AS `mcea_calculation_method`,
  1 AS `mcea_product_id`,
  1 AS `mcea_sku`,
  1 AS `mcea_purchased`,
  1 AS `mcea_growth_allowance`,
  1 AS `mcea_total_purchased`,
  1 AS `mcea_generated`,
  1 AS `mcea_balance`,
  1 AS `mcea_pre_ea`,
  1 AS `mcea_license_migrated`,
  1 AS `mcea_update`,
  1 AS `mcea_track`,
  1 AS `mcea_client_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoEAMeteringLatest`
--

DROP TABLE IF EXISTS `vwCiscoEAMeteringLatest`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoEAMeteringLatest`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoEAMeteringLatest` AS SELECT
 1 AS `mcea_id`,
  1 AS `mcea_client_id`,
  1 AS `mcea_client`,
  1 AS `mcea_domain`,
  1 AS `mcea_virtual_account`,
  1 AS `mcea_subscription`,
  1 AS `mcea_ntf_date`,
  1 AS `mcea_status`,
  1 AS `mcea_start_date`,
  1 AS `mcea_end_date`,
  1 AS `mcea_suite_name`,
  1 AS `mcea_calculation_method`,
  1 AS `mcea_product_id`,
  1 AS `mcea_sku`,
  1 AS `mcea_purchased`,
  1 AS `mcea_growth_allowance`,
  1 AS `mcea_total_purchased`,
  1 AS `mcea_generated`,
  1 AS `mcea_balance`,
  1 AS `mcea_pre_ea`,
  1 AS `mcea_license_migrated`,
  1 AS `mcea_overconsume`,
  1 AS `mcea_update` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoLCI`
--

DROP TABLE IF EXISTS `vwCiscoLCI`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoLCI`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoLCI` AS SELECT
 1 AS `lci_client_name`,
  1 AS `lci_type`,
  1 AS `lci_status`,
  1 AS `lci_track`,
  1 AS `lci_use_case`,
  1 AS `lci_ws`,
  1 AS `lci_deal_id`,
  1 AS `task_eligible`,
  1 AS `lci_csm_name`,
  1 AS `lci_stage_name`,
  1 AS `lci_stage_ws`,
  1 AS `lci_stage_start`,
  1 AS `lci_stage_end`,
  1 AS `lci_stage_end_fy`,
  1 AS `lci_stage_value`,
  1 AS `lci_stage_approval_value`,
  1 AS `lci_stage_approval_date`,
  1 AS `lci_stage_approval_fy`,
  1 AS `lci_stage_backlog_value`,
  1 AS `lci_stage_status_id`,
  1 AS `lci_stage_status_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoLCIjourney`
--

DROP TABLE IF EXISTS `vwCiscoLCIjourney`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoLCIjourney`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoLCIjourney` AS SELECT
 1 AS `task_id`,
  1 AS `task_type_id`,
  1 AS `task_type_name`,
  1 AS `task_client_id`,
  1 AS `task_client_name`,
  1 AS `task_csm_id`,
  1 AS `task_csm_name`,
  1 AS `task_track`,
  1 AS `task_use_case`,
  1 AS `task_ws`,
  1 AS `task_did`,
  1 AS `task_start_date`,
  1 AS `task_end_date`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `task_currency`,
  1 AS `task_value`,
  1 AS `task_forecast`,
  1 AS `task_backlog`,
  1 AS `onboard_status`,
  1 AS `use_status`,
  1 AS `engage_status`,
  1 AS `adopt_status`,
  1 AS `implement_status`,
  1 AS `optimize_status`,
  1 AS `onboard_value`,
  1 AS `use_value`,
  1 AS `engage_value`,
  1 AS `adopt_value`,
  1 AS `implement_value`,
  1 AS `onboard_approved_value`,
  1 AS `use_approved_value`,
  1 AS `engage_approved_value`,
  1 AS `adopt_approved_value`,
  1 AS `implement_approved_value` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoSAConsumptionSummary`
--

DROP TABLE IF EXISTS `vwCiscoSAConsumptionSummary`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoSAConsumptionSummary`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoSAConsumptionSummary` AS SELECT
 1 AS `mcsa_client_id`,
  1 AS `mcsa_domain`,
  1 AS `mcsa_virtual_account`,
  1 AS `mcsa_available_to_use_sum`,
  1 AS `mcsa_in_use_sum`,
  1 AS `mcsa_percentage_in_use_sum_available_to_use_sum`,
  1 AS `mcsa_total_sum`,
  1 AS `mcsa_percentage_in_use_sum_total_sum`,
  1 AS `mcsa_percentage_in_use_sum_total_sum_by_client` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoSAMeteringHistory`
--

DROP TABLE IF EXISTS `vwCiscoSAMeteringHistory`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoSAMeteringHistory`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoSAMeteringHistory` AS SELECT
 1 AS `mcsa_id`,
  1 AS `mcsa_row_type`,
  1 AS `mcsa_client_id`,
  1 AS `mcsa_client`,
  1 AS `mcsa_domain`,
  1 AS `mcsa_product_id`,
  1 AS `mcsa_license`,
  1 AS `mcsa_virtual_account`,
  1 AS `mcsa_billing`,
  1 AS `mcsa_available_to_use`,
  1 AS `mcsa_in_use`,
  1 AS `mcsa_balance`,
  1 AS `mcsa_compliance`,
  1 AS `mcsa_license_type`,
  1 AS `mcsa_quantity`,
  1 AS `mcsa_subscription`,
  1 AS `mcsa_days_to_end`,
  1 AS `mcsa_active`,
  1 AS `mcsa_start_date`,
  1 AS `mcsa_end_date`,
  1 AS `mcsa_update`,
  1 AS `mcsa_track`,
  1 AS `mcsa_client_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoSAMeteringLatest`
--

DROP TABLE IF EXISTS `vwCiscoSAMeteringLatest`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoSAMeteringLatest`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoSAMeteringLatest` AS SELECT
 1 AS `mcsa_id`,
  1 AS `mcsa_client_id`,
  1 AS `mcsa_client`,
  1 AS `mcsa_domain`,
  1 AS `mcsa_product_id`,
  1 AS `mcsa_license`,
  1 AS `mcsa_license_type`,
  1 AS `mcsa_virtual_account`,
  1 AS `mcsa_available_to_use`,
  1 AS `mcsa_in_use`,
  1 AS `mcsa_balance`,
  1 AS `mcsa_quantity`,
  1 AS `mcsa_compliance`,
  1 AS `mcsa_subscription`,
  1 AS `mcsa_start_date`,
  1 AS `mcsa_end_date`,
  1 AS `mcsa_metering_update`,
  1 AS `mcsa_quantity_update` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCiscoSPIArchitecture`
--

DROP TABLE IF EXISTS `vwCiscoSPIArchitecture`;
/*!50001 DROP VIEW IF EXISTS `vwCiscoSPIArchitecture`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCiscoSPIArchitecture` AS SELECT
 1 AS `spi_architecture`,
  1 AS `spi_solution_domain`,
  1 AS `spi_use_case` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCompanyAssetTracking`
--

DROP TABLE IF EXISTS `vwCompanyAssetTracking`;
/*!50001 DROP VIEW IF EXISTS `vwCompanyAssetTracking`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCompanyAssetTracking` AS SELECT
 1 AS `CompanyId`,
  1 AS `CompanyName` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCompanySite`
--

DROP TABLE IF EXISTS `vwCompanySite`;
/*!50001 DROP VIEW IF EXISTS `vwCompanySite`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCompanySite` AS SELECT
 1 AS `site_id`,
  1 AS `site_company_id`,
  1 AS `site_name`,
  1 AS `site_cnpj`,
  1 AS `site_ie`,
  1 AS `site_address`,
  1 AS `site_city`,
  1 AS `site_uf`,
  1 AS `site_country`,
  1 AS `company_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCompanySiteAsset`
--

DROP TABLE IF EXISTS `vwCompanySiteAsset`;
/*!50001 DROP VIEW IF EXISTS `vwCompanySiteAsset`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCompanySiteAsset` AS SELECT
 1 AS `tracking_id`,
  1 AS `tracking_company_id`,
  1 AS `tracking_site_id`,
  1 AS `tracking_site_name`,
  1 AS `tracking_asset_id`,
  1 AS `tracking_operation`,
  1 AS `tracking_operation_by`,
  1 AS `tracking_operation_date`,
  1 AS `tracking_ov`,
  1 AS `tracking_nf`,
  1 AS `tracking_remark`,
  1 AS `tracking_company_name`,
  1 AS `asset_serial_number`,
  1 AS `asset_instance_number`,
  1 AS `asset_product_name`,
  1 AS `asset_product_description` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwContractClient`
--

DROP TABLE IF EXISTS `vwContractClient`;
/*!50001 DROP VIEW IF EXISTS `vwContractClient`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwContractClient` AS SELECT
 1 AS `client_id`,
  1 AS `client_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwContractEndDate`
--

DROP TABLE IF EXISTS `vwContractEndDate`;
/*!50001 DROP VIEW IF EXISTS `vwContractEndDate`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwContractEndDate` AS SELECT
 1 AS `asset_id`,
  1 AS `product_name`,
  1 AS `product_subtype`,
  1 AS `product_vendor_id`,
  1 AS `product_vendor_name`,
  1 AS `serial_number`,
  1 AS `parent_serial_number`,
  1 AS `instance_number`,
  1 AS `parent_instance_number`,
  1 AS `major_minor`,
  1 AS `ntt_contract_client_id`,
  1 AS `ntt_contract_client_name`,
  1 AS `ntt_contract_num`,
  1 AS `ntt_contract_vendor`,
  1 AS `ntt_contract_subscription`,
  1 AS `ntt_contract_id_oracle`,
  1 AS `ntt_contract_oracle_line`,
  1 AS `ntt_contract_oracle_subline`,
  1 AS `ntt_contract_entitlement`,
  1 AS `ntt_contract_ov`,
  1 AS `ntt_contract_po`,
  1 AS `ntt_contract_start_date`,
  1 AS `ntt_contract_end_date`,
  1 AS `vendor_contract_client_id`,
  1 AS `vendor_contract_client_name`,
  1 AS `vendor_contract_num`,
  1 AS `vendor_contract_vendor`,
  1 AS `vendor_contract_subscription`,
  1 AS `vendor_contract_web_order`,
  1 AS `vendor_contract_deal_id`,
  1 AS `vendor_contract_quote`,
  1 AS `vendor_contract_product_so`,
  1 AS `vendor_contract_product_po`,
  1 AS `vendor_contract_service_so`,
  1 AS `vendor_contract_service_po`,
  1 AS `vendor_contract_start_date`,
  1 AS `vendor_contract_end_date`,
  1 AS `shortest_end_date`,
  1 AS `comparing_end_date` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwContractNTTAsset`
--

DROP TABLE IF EXISTS `vwContractNTTAsset`;
/*!50001 DROP VIEW IF EXISTS `vwContractNTTAsset`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwContractNTTAsset` AS SELECT
 1 AS `nttasset_id`,
  1 AS `nttasset_vendor_id`,
  1 AS `nttasset_vendor_name`,
  1 AS `nttasset_nttcontract_id`,
  1 AS `nttasset_contract_number`,
  1 AS `nttasset_customer_id`,
  1 AS `nttasset_customer_name`,
  1 AS `nttasset_am_id`,
  1 AS `nttasset_am_name`,
  1 AS `nttasset_asset_id`,
  1 AS `nttasset_product_id`,
  1 AS `nttasset_product`,
  1 AS `nttasset_contract_description`,
  1 AS `nttasset_serial_num`,
  1 AS `nttasset_instance_num`,
  1 AS `nttasset_subscription_id`,
  1 AS `nttasset_oracle_id`,
  1 AS `nttasset_line`,
  1 AS `nttasset_subline`,
  1 AS `nttasset_apolo_id`,
  1 AS `nttasset_entitlement_id`,
  1 AS `nttasset_entitlement`,
  1 AS `nttasset_ov`,
  1 AS `nttasset_po`,
  1 AS `nttasset_contract_start`,
  1 AS `nttasset_contract_end`,
  1 AS `nttasset_asset_start`,
  1 AS `nttasset_asset_end`,
  1 AS `nttasset_product_status`,
  1 AS `nttasset_city`,
  1 AS `nttasset_status_renewal`,
  1 AS `nttasset_parts_contract`,
  1 AS `nttasset_quote_ref`,
  1 AS `nttasset_service_status`,
  1 AS `nttasset_quote`,
  1 AS `nttasset_shortdescription`,
  1 AS `nttasset_gross_profit`,
  1 AS `nttasset_price`,
  1 AS `nttasset_currency`,
  1 AS `nttasset_quantity`,
  1 AS `nttasset_contract_amount`,
  1 AS `nttasset_acc_rule`,
  1 AS `nttasset_date_terminated`,
  1 AS `asset_id`,
  1 AS `asset_product_id`,
  1 AS `asset_ponumber`,
  1 AS `asset_sonumber`,
  1 AS `asset_type`,
  1 AS `asset_subscription_id`,
  1 AS `asset_serial_number`,
  1 AS `asset_parent_serial_number`,
  1 AS `asset_instance_number`,
  1 AS `asset_parent_instance_number`,
  1 AS `asset_parent_level`,
  1 AS `asset_sales_order`,
  1 AS `asset_web_order_id`,
  1 AS `asset_deal_id`,
  1 AS `asset_price`,
  1 AS `asset_rfid`,
  1 AS `asset_ov`,
  1 AS `asset_warehouse`,
  1 AS `product_id`,
  1 AS `product_manufacturer_id`,
  1 AS `product_manufacturer_name`,
  1 AS `product_vendor_id`,
  1 AS `product_name`,
  1 AS `product_family`,
  1 AS `product_subfamily`,
  1 AS `product_group`,
  1 AS `product_subtype`,
  1 AS `product_type`,
  1 AS `product_business_entity`,
  1 AS `product_subbusiness_entity`,
  1 AS `product_description`,
  1 AS `product_endofsupport`,
  1 AS `product_endofsoftwaremaintenance`,
  1 AS `product_endofsale`,
  1 AS `product_bulletin`,
  1 AS `product_pid_mapping_group`,
  1 AS `product_remark`,
  1 AS `product_vendor_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwContractNTTMMR`
--

DROP TABLE IF EXISTS `vwContractNTTMMR`;
/*!50001 DROP VIEW IF EXISTS `vwContractNTTMMR`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwContractNTTMMR` AS SELECT
 1 AS `customer_id`,
  1 AS `contract_number`,
  1 AS `contract_start_date`,
  1 AS `contract_start_end`,
  1 AS `contract_amount`,
  1 AS `contract_months`,
  1 AS `contract_mrr`,
  1 AS `contract_status` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwContractVendorAsset`
--

DROP TABLE IF EXISTS `vwContractVendorAsset`;
/*!50001 DROP VIEW IF EXISTS `vwContractVendorAsset`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwContractVendorAsset` AS SELECT
 1 AS `vendorasset_id`,
  1 AS `vendorasset_contract_num`,
  1 AS `vendorasset_vendor_id`,
  1 AS `vendorasset_vendor_name`,
  1 AS `vendorasset_customer_id`,
  1 AS `vendorasset_customer_name`,
  1 AS `vendorasset_asset_id`,
  1 AS `vendorasset_product_id`,
  1 AS `vendorasset_start`,
  1 AS `vendorasset_end`,
  1 AS `vendorasset_status`,
  1 AS `vendorasset_renewal`,
  1 AS `vendorasset_auto_renewal`,
  1 AS `vendorasset_billing_frequency`,
  1 AS `vendorasset_service_level`,
  1 AS `vendorasset_sku`,
  1 AS `vendorasset_quantity`,
  1 AS `vendorasset_product_price`,
  1 AS `vendorasset_service_price`,
  1 AS `vendorasset_subscription_id`,
  1 AS `vendorasset_web_order_id`,
  1 AS `vendorasset_deal_id`,
  1 AS `vendorasset_installed_status`,
  1 AS `vendorasset_smart_account`,
  1 AS `vendorasset_product_so`,
  1 AS `vendorasset_product_po`,
  1 AS `vendorasset_service_so`,
  1 AS `vendorasset_service_po`,
  1 AS `vendorasset_maintenance_so`,
  1 AS `vendorasset_maintenance_po`,
  1 AS `vendorasset_quote`,
  1 AS `vendorasset_contract_type`,
  1 AS `vendorasset_coverage`,
  1 AS `vendorasset_coverage_status`,
  1 AS `vendorasset_buying_program`,
  1 AS `vendorasset_suport_service_level`,
  1 AS `vendorasset_install_site_gu_name`,
  1 AS `vendorasset_install_site_cr_parent_name`,
  1 AS `vendorasset_install_site_cr_party_name`,
  1 AS `vendorasset_install_site_name`,
  1 AS `vendorasset_best_partner_be_geo_id`,
  1 AS `vendorasset_best_partner_be_geo_name`,
  1 AS `vendorasset_product_bill_to_partner_name`,
  1 AS `vendorasset_product_partner_geo_geo_name`,
  1 AS `vendorasset_pos_partner_be_geo_name`,
  1 AS `vendorasset_service_bill_partner_name`,
  1 AS `vendorasset_service_partner_be_geo_name`,
  1 AS `vendorasset_service_indicator`,
  1 AS `vendorasset_date_booked`,
  1 AS `vendorasset_date_ordered`,
  1 AS `vendorasset_remark`,
  1 AS `vendorasset_contract_description`,
  1 AS `vendorasset_migration_pid_list`,
  1 AS `vendorasset_existing_coverage_level_list_price`,
  1 AS `vendorasset_atr_eligible`,
  1 AS `vendorasset_do_not_renew_reason`,
  1 AS `vendorasset_end_fy_vendor`,
  1 AS `vendorasset_end_fq_vendor`,
  1 AS `vendorasset_end_fy_ntt`,
  1 AS `vendorasset_end_fq_ntt`,
  1 AS `vendorasset_end_fy_calendar`,
  1 AS `vendorasset_end_fq_calendar`,
  1 AS `asset_id`,
  1 AS `asset_product_id`,
  1 AS `asset_ponumber`,
  1 AS `asset_sonumber`,
  1 AS `asset_type`,
  1 AS `asset_subscription_id`,
  1 AS `asset_serial_number`,
  1 AS `asset_parent_serial_number`,
  1 AS `asset_instance_number`,
  1 AS `asset_parent_instance_number`,
  1 AS `asset_parent_level`,
  1 AS `asset_sales_order`,
  1 AS `asset_web_order_id`,
  1 AS `asset_deal_id`,
  1 AS `asset_price`,
  1 AS `asset_rfid`,
  1 AS `asset_ov`,
  1 AS `asset_warehouse`,
  1 AS `product_id`,
  1 AS `product_manufacturer_id`,
  1 AS `product_manufacturer_name`,
  1 AS `product_vendor_id`,
  1 AS `product_name`,
  1 AS `product_family`,
  1 AS `product_subfamily`,
  1 AS `product_group`,
  1 AS `product_subtype`,
  1 AS `product_type`,
  1 AS `product_business_entity`,
  1 AS `product_subbusiness_entity`,
  1 AS `product_description`,
  1 AS `product_endofsupport`,
  1 AS `product_endofsoftwaremaintenance`,
  1 AS `product_endofsale`,
  1 AS `product_bulletin`,
  1 AS `product_pid_mapping_group`,
  1 AS `product_remark`,
  1 AS `product_vendor_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCustomerCiscoEAConsolidated`
--

DROP TABLE IF EXISTS `vwCustomerCiscoEAConsolidated`;
/*!50001 DROP VIEW IF EXISTS `vwCustomerCiscoEAConsolidated`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCustomerCiscoEAConsolidated` AS SELECT
 1 AS `customer_id`,
  1 AS `customer_name`,
  1 AS `ea_type`,
  1 AS `subscription_id`,
  1 AS `ea_suite`,
  1 AS `start_date`,
  1 AS `end_date`,
  1 AS `contract_status`,
  1 AS `onboard_status`,
  1 AS `dir`,
  1 AS `am`,
  1 AS `csm`,
  1 AS `rsa`,
  1 AS `pas` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCustomerCiscoLCIDealTrackProjectStatus`
--

DROP TABLE IF EXISTS `vwCustomerCiscoLCIDealTrackProjectStatus`;
/*!50001 DROP VIEW IF EXISTS `vwCustomerCiscoLCIDealTrackProjectStatus`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCustomerCiscoLCIDealTrackProjectStatus` AS SELECT
 1 AS `customer_name`,
  1 AS `task_deal_id`,
  1 AS `solution_track`,
  1 AS `has_project`,
  1 AS `potential_use_case`,
  1 AS `potential_value_usd`,
  1 AS `potential_task_ws`,
  1 AS `potential_task_status` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwCustomerCiscoLCITrackProjectPM`
--

DROP TABLE IF EXISTS `vwCustomerCiscoLCITrackProjectPM`;
/*!50001 DROP VIEW IF EXISTS `vwCustomerCiscoLCITrackProjectPM`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwCustomerCiscoLCITrackProjectPM` AS SELECT
 1 AS `customer_id`,
  1 AS `customer_name`,
  1 AS `Track`,
  1 AS `qty_project`,
  1 AS `pm_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwFilterAssetContractEnd`
--

DROP TABLE IF EXISTS `vwFilterAssetContractEnd`;
/*!50001 DROP VIEW IF EXISTS `vwFilterAssetContractEnd`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwFilterAssetContractEnd` AS SELECT
 1 AS `customer_id`,
  1 AS `customer_name`,
  1 AS `asset_id`,
  1 AS `subscription_id`,
  1 AS `asset_product_id`,
  1 AS `product_name`,
  1 AS `asset_serial_number`,
  1 AS `asset_instance_number`,
  1 AS `major_minor` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwFilterCompanyFromContract`
--

DROP TABLE IF EXISTS `vwFilterCompanyFromContract`;
/*!50001 DROP VIEW IF EXISTS `vwFilterCompanyFromContract`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwFilterCompanyFromContract` AS SELECT
 1 AS `customer_id`,
  1 AS `customer_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwFilterTask`
--

DROP TABLE IF EXISTS `vwFilterTask`;
/*!50001 DROP VIEW IF EXISTS `vwFilterTask`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwFilterTask` AS SELECT
 1 AS `task_id`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name`,
  1 AS `task_type_id`,
  1 AS `task_type_name`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `task_ws`,
  1 AS `task_deal_id`,
  1 AS `task_track`,
  1 AS `task_start_performed`,
  1 AS `task_end_performed` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwFilterTaskOwner`
--

DROP TABLE IF EXISTS `vwFilterTaskOwner`;
/*!50001 DROP VIEW IF EXISTS `vwFilterTaskOwner`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwFilterTaskOwner` AS SELECT
 1 AS `task_owner_id`,
  1 AS `task_owner_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwForecast`
--

DROP TABLE IF EXISTS `vwForecast`;
/*!50001 DROP VIEW IF EXISTS `vwForecast`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwForecast` AS SELECT
 1 AS `task_id`,
  1 AS `task_tasktype_id`,
  1 AS `task_tasktype_name`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_client_id`,
  1 AS `task_client_name`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `activity_status_id`,
  1 AS `activity_status_name`,
  1 AS `activity_value`,
  1 AS `activity_currency`,
  1 AS `activity_end`,
  1 AS `activity_end_fy`,
  1 AS `activity_approved`,
  1 AS `activity_approved_value`,
  1 AS `activity_approval_date`,
  1 AS `activity_approval_fy` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwHeatmap`
--

DROP TABLE IF EXISTS `vwHeatmap`;
/*!50001 DROP VIEW IF EXISTS `vwHeatmap`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwHeatmap` AS SELECT
 1 AS `heatmap_id`,
  1 AS `heatmap_customer_id`,
  1 AS `heatmap_customer_name`,
  1 AS `heatmap_vendor_id`,
  1 AS `heatmap_vendor_name`,
  1 AS `heatmap_sales_status`,
  1 AS `heatmap_technology_domain`,
  1 AS `heatmap_competitor_present` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwIdleAsset`
--

DROP TABLE IF EXISTS `vwIdleAsset`;
/*!50001 DROP VIEW IF EXISTS `vwIdleAsset`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwIdleAsset` AS SELECT
 1 AS `ClientId`,
  1 AS `Client`,
  1 AS `ClientSiteId`,
  1 AS `ClientSite`,
  1 AS `ClientSiteCity`,
  1 AS `ClientSiteUF`,
  1 AS `AssetId`,
  1 AS `ProductId`,
  1 AS `PartNumber`,
  1 AS `Description`,
  1 AS `SerialNumber`,
  1 AS `UnitValue`,
  1 AS `DeliveryDate`,
  1 AS `DaysOfIdleness`,
  1 AS `LoS`,
  1 AS `rn`,
  1 AS `tracking_operation` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwKPICiscoSVIEngagementTotalEligible`
--

DROP TABLE IF EXISTS `vwKPICiscoSVIEngagementTotalEligible`;
/*!50001 DROP VIEW IF EXISTS `vwKPICiscoSVIEngagementTotalEligible`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwKPICiscoSVIEngagementTotalEligible` AS SELECT
 1 AS `month`,
  1 AS `year`,
  1 AS `total_eligible` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwKPICiscoSVIEngagementTotalOnboard`
--

DROP TABLE IF EXISTS `vwKPICiscoSVIEngagementTotalOnboard`;
/*!50001 DROP VIEW IF EXISTS `vwKPICiscoSVIEngagementTotalOnboard`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwKPICiscoSVIEngagementTotalOnboard` AS SELECT
 1 AS `month`,
  1 AS `year`,
  1 AS `stage`,
  1 AS `total_onboard`,
  1 AS `total_eligible`,
  1 AS `nvi`,
  1 AS `pvi` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwMeasureTeamGoal`
--

DROP TABLE IF EXISTS `vwMeasureTeamGoal`;
/*!50001 DROP VIEW IF EXISTS `vwMeasureTeamGoal`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwMeasureTeamGoal` AS SELECT
 1 AS `goal_id`,
  1 AS `goal_tasks_list`,
  1 AS `goal_users_list`,
  1 AS `goal_fy`,
  1 AS `goal_team_id`,
  1 AS `goal_measurement_by_counting`,
  1 AS `goal_measurement_by_sum`,
  1 AS `goal_value`,
  1 AS `goal_point`,
  1 AS `goal_multiplier`,
  1 AS `goal_individual`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_tasktype_id`,
  1 AS `activity_approved_value`,
  1 AS `activity_approval_fy`,
  1 AS `task_list_match_status` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwMeasureTeamTarget`
--

DROP TABLE IF EXISTS `vwMeasureTeamTarget`;
/*!50001 DROP VIEW IF EXISTS `vwMeasureTeamTarget`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwMeasureTeamTarget` AS SELECT
 1 AS `target_id`,
  1 AS `target_tasks_list`,
  1 AS `target_users_list`,
  1 AS `target_fy`,
  1 AS `target_team_id`,
  1 AS `target_measurement_by_counting`,
  1 AS `target_measurement_by_sum`,
  1 AS `target_value`,
  1 AS `target_point`,
  1 AS `target_multiplier`,
  1 AS `target_individual`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_tasktype_id`,
  1 AS `activity_approved_value`,
  1 AS `activity_approval_fy`,
  1 AS `task_list_match_status` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwOpportunity12m`
--

DROP TABLE IF EXISTS `vwOpportunity12m`;
/*!50001 DROP VIEW IF EXISTS `vwOpportunity12m`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwOpportunity12m` AS SELECT
 1 AS `opportunity_customer_id`,
  1 AS `opportunity_customer_name`,
  1 AS `opportunity_amount_total_12m`,
  1 AS `opportunity_amount_deal_lost_12m`,
  1 AS `opportunity_amount_identification_12m`,
  1 AS `opportunity_amount_finalist_12m`,
  1 AS `opportunity_amount_proposal_evaluation_12m`,
  1 AS `opportunity_amount_deal_won_12m`,
  1 AS `opportunity_amount_proposal_12m`,
  1 AS `opportunity_amount_qualification_12m`,
  1 AS `opportunity_amount_requirements_definition_12m` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwProduct`
--

DROP TABLE IF EXISTS `vwProduct`;
/*!50001 DROP VIEW IF EXISTS `vwProduct`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwProduct` AS SELECT
 1 AS `product_id`,
  1 AS `product_manufacturer_id`,
  1 AS `product_manufacturer_name`,
  1 AS `product_vendor_id`,
  1 AS `product_name`,
  1 AS `product_family`,
  1 AS `product_subfamily`,
  1 AS `product_group`,
  1 AS `product_subtype`,
  1 AS `product_type`,
  1 AS `product_business_entity`,
  1 AS `product_subbusiness_entity`,
  1 AS `product_description`,
  1 AS `product_endofsupport`,
  1 AS `product_endofsoftwaremaintenance`,
  1 AS `product_endofsale`,
  1 AS `product_bulletin`,
  1 AS `product_pid_mapping_group`,
  1 AS `product_remark`,
  1 AS `product_vendor_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwProject`
--

DROP TABLE IF EXISTS `vwProject`;
/*!50001 DROP VIEW IF EXISTS `vwProject`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwProject` AS SELECT
 1 AS `project_id`,
  1 AS `project_ov`,
  1 AS `project_owner`,
  1 AS `project_customer_id`,
  1 AS `project_customer_name`,
  1 AS `project_name`,
  1 AS `project_ov_name`,
  1 AS `project_internalization_date`,
  1 AS `project_start_date`,
  1 AS `project_end_date`,
  1 AS `project_status`,
  1 AS `project_description`,
  1 AS `project_scope`,
  1 AS `project_objectives`,
  1 AS `project_current_scenario`,
  1 AS `project_key_feature_products`,
  1 AS `project_justification`,
  1 AS `project_remark`,
  1 AS `project_methodology`,
  1 AS `project_action`,
  1 AS `project_sprint_timebox`,
  1 AS `project_currency`,
  1 AS `project_total_amount`,
  1 AS `project_total_amount_brl`,
  1 AS `project_planned_cost_subcontract_brl`,
  1 AS `project_planned_cost_subcontract_po_brl`,
  1 AS `project_planned_cost_pct_brl`,
  1 AS `project_planned_cost_brl`,
  1 AS `project_cost_final_value_brl` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwProjectTeam`
--

DROP TABLE IF EXISTS `vwProjectTeam`;
/*!50001 DROP VIEW IF EXISTS `vwProjectTeam`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwProjectTeam` AS SELECT
 1 AS `projteam_id`,
  1 AS `projteam_project_id`,
  1 AS `projteam_project_name`,
  1 AS `projteam_project_ov`,
  1 AS `projteam_project_customer_id`,
  1 AS `projteam_project_customer_name`,
  1 AS `projteam_project_status`,
  1 AS `projteam_member_id`,
  1 AS `projteam_member_name`,
  1 AS `projteam_department_id`,
  1 AS `projteam_department_name`,
  1 AS `projteam_level_id`,
  1 AS `projteam_level_name`,
  1 AS `projteam_technical_lead`,
  1 AS `projteam_working_time`,
  1 AS `projteam_allocation_start`,
  1 AS `projteam_allocation_end` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwSquad`
--

DROP TABLE IF EXISTS `vwSquad`;
/*!50001 DROP VIEW IF EXISTS `vwSquad`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwSquad` AS SELECT
 1 AS `squad_id`,
  1 AS `squad_user_id`,
  1 AS `squad_user_name`,
  1 AS `squad_department_id`,
  1 AS `squad_department_name`,
  1 AS `squad_department_area`,
  1 AS `squad_level_id`,
  1 AS `squad_level_name`,
  1 AS `squad_level_ratecard` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwSquadCSM`
--

DROP TABLE IF EXISTS `vwSquadCSM`;
/*!50001 DROP VIEW IF EXISTS `vwSquadCSM`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwSquadCSM` AS SELECT
 1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `csm_level_id`,
  1 AS `csm_level_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwSquadCSMActive`
--

DROP TABLE IF EXISTS `vwSquadCSMActive`;
/*!50001 DROP VIEW IF EXISTS `vwSquadCSMActive`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwSquadCSMActive` AS SELECT
 1 AS `csm_id`,
  1 AS `csm_name`,
  1 AS `csm_level_id`,
  1 AS `csm_level_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTESTE`
--

DROP TABLE IF EXISTS `vwTESTE`;
/*!50001 DROP VIEW IF EXISTS `vwTESTE`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTESTE` AS SELECT
 1 AS `task_owner_id`,
  1 AS `task_customer_id`,
  1 AS `task_id`,
  1 AS `activity_id`,
  1 AS `activity_name`,
  1 AS `activity_approved_value`,
  1 AS `activity_approval_date`,
  1 AS `FY` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTask`
--

DROP TABLE IF EXISTS `vwTask`;
/*!50001 DROP VIEW IF EXISTS `vwTask`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTask` AS SELECT
 1 AS `task_id`,
  1 AS `task_type_id`,
  1 AS `task_type_name`,
  1 AS `task_reference`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_temp_owner_id`,
  1 AS `task_temp_owner_name`,
  1 AS `task_cr_party_id`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name`,
  1 AS `task_created_in`,
  1 AS `task_created_by_id`,
  1 AS `task_created_by_name`,
  1 AS `task_priority`,
  1 AS `task_project_id`,
  1 AS `task_project_name`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `task_status_justification`,
  1 AS `task_start`,
  1 AS `task_end`,
  1 AS `task_start_performed`,
  1 AS `task_end_performed`,
  1 AS `task_end_fy`,
  1 AS `task_booking_date`,
  1 AS `task_booking_amount`,
  1 AS `task_deal_id`,
  1 AS `task_ws`,
  1 AS `task_completed`,
  1 AS `task_architecture`,
  1 AS `task_solution_domain`,
  1 AS `task_track`,
  1 AS `task_subtrack`,
  1 AS `task_eligible`,
  1 AS `task_value`,
  1 AS `task_forecast`,
  1 AS `task_backlog`,
  1 AS `task_rate`,
  1 AS `task_currency`,
  1 AS `task_description`,
  1 AS `task_remark`,
  1 AS `task_ea_flag`,
  1 AS `task_opt_in_flag`,
  1 AS `spi_lifecycle_stage`,
  1 AS `spi_last_checked_date`,
  1 AS `task_telemetry_flag`,
  1 AS `spi_telemetry_type` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskActivity`
--

DROP TABLE IF EXISTS `vwTaskActivity`;
/*!50001 DROP VIEW IF EXISTS `vwTaskActivity`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskActivity` AS SELECT
 1 AS `activity_id`,
  1 AS `activity_task_id`,
  1 AS `activity_seq`,
  1 AS `activity_name`,
  1 AS `activity_objective`,
  1 AS `activity_scope`,
  1 AS `activity_expected_results`,
  1 AS `activity_effort`,
  1 AS `activity_status_id`,
  1 AS `activity_status_name`,
  1 AS `activity_ws`,
  1 AS `activity_deal_id`,
  1 AS `activity_track`,
  1 AS `activity_sub_track`,
  1 AS `activity_value`,
  1 AS `activity_currency`,
  1 AS `activity_start`,
  1 AS `activity_end`,
  1 AS `activity_start_performed`,
  1 AS `activity_end_performed`,
  1 AS `activity_effort_performed`,
  1 AS `activity_completed`,
  1 AS `activity_approved`,
  1 AS `activity_approved_value`,
  1 AS `activity_approved_currency`,
  1 AS `activity_approval_date`,
  1 AS `activity_approval_request_date`,
  1 AS `activity_approval_fy`,
  1 AS `activity_end_fy`,
  1 AS `activity_backlog_value`,
  1 AS `task_type_name`,
  1 AS `task_client_id`,
  1 AS `task_client_name`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_temp_owner_id`,
  1 AS `task_temp_owner_name`,
  1 AS `task_status_id`,
  1 AS `max_next_followup` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskActivityDashboard`
--

DROP TABLE IF EXISTS `vwTaskActivityDashboard`;
/*!50001 DROP VIEW IF EXISTS `vwTaskActivityDashboard`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskActivityDashboard` AS SELECT
 1 AS `activity_id`,
  1 AS `activity_task_id`,
  1 AS `activity_seq`,
  1 AS `activity_name`,
  1 AS `activity_objective`,
  1 AS `activity_scope`,
  1 AS `activity_expected_results`,
  1 AS `activity_effort`,
  1 AS `activity_effort_performed`,
  1 AS `activity_status_id`,
  1 AS `activity_status_name`,
  1 AS `activity_start`,
  1 AS `activity_end`,
  1 AS `activity_start_performed`,
  1 AS `activity_end_performed`,
  1 AS `activity_value`,
  1 AS `activity_currency`,
  1 AS `activity_completed`,
  1 AS `activity_approved`,
  1 AS `activity_approved_value`,
  1 AS `activity_approved_currency`,
  1 AS `activity_approval_date`,
  1 AS `activity_approval_request_date`,
  1 AS `activity_approval_fy`,
  1 AS `activity_end_fy`,
  1 AS `activity_backlog_value`,
  1 AS `activity_ws`,
  1 AS `activity_deal_id`,
  1 AS `activity_track`,
  1 AS `activity_sub_track`,
  1 AS `task_type_id`,
  1 AS `task_type_name`,
  1 AS `critical_level`,
  1 AS `critical_reason`,
  1 AS `task_for_team`,
  1 AS `task_priority`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_temp_owner_id`,
  1 AS `task_temp_owner_name`,
  1 AS `task_ws`,
  1 AS `task_track`,
  1 AS `task_subtrack`,
  1 AS `task_deal_id`,
  1 AS `next_followup_activity_upcoming`,
  1 AS `next_followup_activity_last`,
  1 AS `next_followup_activity_effective`,
  1 AS `is_activity_completed`,
  1 AS `is_activity_plan_overdue`,
  1 AS `days_activity_plan_overdue`,
  1 AS `followup_activity_is_missing`,
  1 AS `followup_activity_is_today`,
  1 AS `followup_activity_is_overdue` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskCustomer`
--

DROP TABLE IF EXISTS `vwTaskCustomer`;
/*!50001 DROP VIEW IF EXISTS `vwTaskCustomer`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskCustomer` AS SELECT
 1 AS `task_customer_id`,
  1 AS `task_customer_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskDashboard`
--

DROP TABLE IF EXISTS `vwTaskDashboard`;
/*!50001 DROP VIEW IF EXISTS `vwTaskDashboard`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskDashboard` AS SELECT
 1 AS `task_id`,
  1 AS `task_type_id`,
  1 AS `task_type_name`,
  1 AS `task_for_team`,
  1 AS `task_finance_type`,
  1 AS `critical_level`,
  1 AS `critical_reason`,
  1 AS `is_service_impacting`,
  1 AS `task_reference`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_temp_owner_id`,
  1 AS `task_temp_owner_name`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name`,
  1 AS `task_priority`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `task_status_justification`,
  1 AS `task_start`,
  1 AS `task_end`,
  1 AS `task_start_performed`,
  1 AS `task_end_performed`,
  1 AS `task_deal_id`,
  1 AS `task_ws`,
  1 AS `task_track`,
  1 AS `task_subtrack`,
  1 AS `task_project_id`,
  1 AS `task_project_name`,
  1 AS `task_value`,
  1 AS `task_currency`,
  1 AS `task_completed`,
  1 AS `next_followup_task_upcoming`,
  1 AS `next_followup_task_last`,
  1 AS `next_followup_task_effective`,
  1 AS `next_followup_activities_upcoming`,
  1 AS `next_followup_activities_last`,
  1 AS `next_followup_activities_effective`,
  1 AS `next_followup_any_effective`,
  1 AS `is_completed`,
  1 AS `is_plan_overdue`,
  1 AS `days_plan_overdue`,
  1 AS `followup_any_is_missing`,
  1 AS `followup_any_is_today`,
  1 AS `followup_any_is_overdue`,
  1 AS `open_age_days` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskIncentive`
--

DROP TABLE IF EXISTS `vwTaskIncentive`;
/*!50001 DROP VIEW IF EXISTS `vwTaskIncentive`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskIncentive` AS SELECT
 1 AS `task_id`,
  1 AS `task_tasktype_id`,
  1 AS `task_tasktype_name`,
  1 AS `task_use_case`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_client_id`,
  1 AS `task_client_name`,
  1 AS `task_start`,
  1 AS `task_end`,
  1 AS `task_days`,
  1 AS `task_end_fy`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `task_value`,
  1 AS `task_forecast`,
  1 AS `task_backlog` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskNoCSMListCustomer`
--

DROP TABLE IF EXISTS `vwTaskNoCSMListCustomer`;
/*!50001 DROP VIEW IF EXISTS `vwTaskNoCSMListCustomer`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskNoCSMListCustomer` AS SELECT
 1 AS `task_owner_id`,
  1 AS `task_type_id`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name`,
  1 AS `accountteam_am_id`,
  1 AS `accountteam_am_name`,
  1 AS `accountteam_csm_id` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskOwnerMinOccurrence`
--

DROP TABLE IF EXISTS `vwTaskOwnerMinOccurrence`;
/*!50001 DROP VIEW IF EXISTS `vwTaskOwnerMinOccurrence`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskOwnerMinOccurrence` AS SELECT
 1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_type_id`,
  1 AS `task_type_name`,
  1 AS `occurrences` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskRACI`
--

DROP TABLE IF EXISTS `vwTaskRACI`;
/*!50001 DROP VIEW IF EXISTS `vwTaskRACI`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskRACI` AS SELECT
 1 AS `taskraci_task_id`,
  1 AS `taskraci_subtask_id`,
  1 AS `taskrack_stakeholder_id`,
  1 AS `taskrack_stakeholder_name`,
  1 AS `taskraci_stakeholder_type`,
  1 AS `taskraci_responsibility` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskRecordNextFollowUp`
--

DROP TABLE IF EXISTS `vwTaskRecordNextFollowUp`;
/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUp`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskRecordNextFollowUp` AS SELECT
 1 AS `task_id`,
  1 AS `task_tasktype_id`,
  1 AS `tasktype_name`,
  1 AS `activity_id`,
  1 AS `activity_name`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_temp_owner_id`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name`,
  1 AS `next_follow_up` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskRecordNextFollowUpCurrentWeek`
--

DROP TABLE IF EXISTS `vwTaskRecordNextFollowUpCurrentWeek`;
/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUpCurrentWeek`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskRecordNextFollowUpCurrentWeek` AS SELECT
 1 AS `task_id`,
  1 AS `task_type_name`,
  1 AS `activity_id`,
  1 AS `activity_name`,
  1 AS `next_followup`,
  1 AS `task_status`,
  1 AS `activity_status`,
  1 AS `task_owner_id`,
  1 AS `task_temp_owner_id`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskRecordNextFollowUpDelayed`
--

DROP TABLE IF EXISTS `vwTaskRecordNextFollowUpDelayed`;
/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUpDelayed`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskRecordNextFollowUpDelayed` AS SELECT
 1 AS `task_id`,
  1 AS `task_type_name`,
  1 AS `activity_id`,
  1 AS `activity_name`,
  1 AS `next_followup`,
  1 AS `task_status`,
  1 AS `activity_status`,
  1 AS `task_owner_id`,
  1 AS `task_temp_owner_id`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskRecordNextFollowUpNextWeek`
--

DROP TABLE IF EXISTS `vwTaskRecordNextFollowUpNextWeek`;
/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUpNextWeek`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskRecordNextFollowUpNextWeek` AS SELECT
 1 AS `task_id`,
  1 AS `task_type_name`,
  1 AS `activity_id`,
  1 AS `activity_name`,
  1 AS `next_followup`,
  1 AS `task_status`,
  1 AS `activity_status`,
  1 AS `task_owner_id`,
  1 AS `task_temp_owner_id`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskRecordNextFollowUpToday`
--

DROP TABLE IF EXISTS `vwTaskRecordNextFollowUpToday`;
/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUpToday`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskRecordNextFollowUpToday` AS SELECT
 1 AS `task_id`,
  1 AS `task_type_name`,
  1 AS `activity_id`,
  1 AS `activity_name`,
  1 AS `next_followup`,
  1 AS `task_status`,
  1 AS `activity_status`,
  1 AS `task_owner_id`,
  1 AS `task_temp_owner_id`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskSIPNewOpportunity`
--

DROP TABLE IF EXISTS `vwTaskSIPNewOpportunity`;
/*!50001 DROP VIEW IF EXISTS `vwTaskSIPNewOpportunity`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskSIPNewOpportunity` AS SELECT
 1 AS `task_id`,
  1 AS `task_tasktype_id`,
  1 AS `task_tasktype_name`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_owner_squad_id`,
  1 AS `task_owner_squad_name`,
  1 AS `task_client_id`,
  1 AS `task_client_name`,
  1 AS `task_reference`,
  1 AS `task_start`,
  1 AS `task_end`,
  1 AS `task_days`,
  1 AS `task_end_fy`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `task_deal_id`,
  1 AS `task_currency`,
  1 AS `task_deal_value`,
  1 AS `task_note` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskTechnologyAdoptionReport`
--

DROP TABLE IF EXISTS `vwTaskTechnologyAdoptionReport`;
/*!50001 DROP VIEW IF EXISTS `vwTaskTechnologyAdoptionReport`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskTechnologyAdoptionReport` AS SELECT
 1 AS `task_id`,
  1 AS `task_customer_id`,
  1 AS `task_customer_name`,
  1 AS `task_type_id`,
  1 AS `task_type_name`,
  1 AS `task_owner_id`,
  1 AS `task_owner_name`,
  1 AS `task_status_id`,
  1 AS `task_status_name`,
  1 AS `task_start`,
  1 AS `task_end` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwTaskValueRollup`
--

DROP TABLE IF EXISTS `vwTaskValueRollup`;
/*!50001 DROP VIEW IF EXISTS `vwTaskValueRollup`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwTaskValueRollup` AS SELECT
 1 AS `task_id`,
  1 AS `task_owner_id`,
  1 AS `task_for_team`,
  1 AS `task_value_sum_brl`,
  1 AS `task_value_sum_usd`,
  1 AS `has_activity_value`,
  1 AS `task_value_effective_brl`,
  1 AS `task_value_effective_usd`,
  1 AS `value_source` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwUseCase`
--

DROP TABLE IF EXISTS `vwUseCase`;
/*!50001 DROP VIEW IF EXISTS `vwUseCase`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwUseCase` AS SELECT
 1 AS `uc_id`,
  1 AS `uc_architecture`,
  1 AS `uc_solution_domain`,
  1 AS `uc_use_case`,
  1 AS `uc_primary_product_id`,
  1 AS `uc_primary_product_name`,
  1 AS `uc_vendor_id`,
  1 AS `uc_vendor_name`,
  1 AS `uc_key_supporting_products`,
  1 AS `uc_key_capabilities`,
  1 AS `uc_it_operations_benefits`,
  1 AS `uc_business_benefits`,
  1 AS `uc_success_metrics`,
  1 AS `uc_business_outcomes`,
  1 AS `uc_description` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwUseCaseExitCriteria`
--

DROP TABLE IF EXISTS `vwUseCaseExitCriteria`;
/*!50001 DROP VIEW IF EXISTS `vwUseCaseExitCriteria`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwUseCaseExitCriteria` AS SELECT
 1 AS `ucec_id`,
  1 AS `ucec_tasktype_id`,
  1 AS `ucec_uc_id`,
  1 AS `ucec_seq`,
  1 AS `ucec_name`,
  1 AS `ucec_objective`,
  1 AS `ucec_scope`,
  1 AS `ucec_expected_results`,
  1 AS `ucec_update_date`,
  1 AS `ucec_tasktype_name` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwUser`
--

DROP TABLE IF EXISTS `vwUser`;
/*!50001 DROP VIEW IF EXISTS `vwUser`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwUser` AS SELECT
 1 AS `user_id`,
  1 AS `user_name`,
  1 AS `user_company_id`,
  1 AS `user_company_name`,
  1 AS `user_telephone`,
  1 AS `user_cellphone`,
  1 AS `user_email`,
  1 AS `user_type`,
  1 AS `user_department`,
  1 AS `user_job_title`,
  1 AS `user_hiring`,
  1 AS `user_termination` */;
SET character_set_client = @saved_cs_client;

--
-- Temporary table structure for view `vwUserNTT`
--

DROP TABLE IF EXISTS `vwUserNTT`;
/*!50001 DROP VIEW IF EXISTS `vwUserNTT`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8mb4;
/*!50001 CREATE VIEW `vwUserNTT` AS SELECT
 1 AS `user_id`,
  1 AS `user_name`,
  1 AS `user_full_name`,
  1 AS `user_alternative_name`,
  1 AS `user_telephone`,
  1 AS `user_cellphone`,
  1 AS `user_email`,
  1 AS `user_type`,
  1 AS `user_company_id`,
  1 AS `user_department`,
  1 AS `user_job_title`,
  1 AS `user_admin`,
  1 AS `user_manager`,
  1 AS `user_language`,
  1 AS `user_password`,
  1 AS `user_change_passwd`,
  1 AS `user_hiring`,
  1 AS `user_termination`,
  1 AS `user_allow_import_xls`,
  1 AS `user_allow_adoption_dash`,
  1 AS `user_allow_capacity_dash`,
  1 AS `user_allow_project_dash`,
  1 AS `user_allow_notafiscal_dash`,
  1 AS `user_allow_contract_dash`,
  1 AS `user_allow_iteminfo_dash`,
  1 AS `user_allow_technical_dash`,
  1 AS `user_allow_operational_dash`,
  1 AS `user_allow_panorama_dash` */;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'pegasus'
--
/*!50106 SET @save_time_zone= @@TIME_ZONE */ ;
/*!50106 DROP EVENT IF EXISTS `event_daily_check_fiscal_year` */;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`pegasus`@`%`*/ /*!50106 EVENT `event_daily_check_fiscal_year` ON SCHEDULE EVERY 1 DAY STARTS '2025-08-11 00:00:00' ON COMPLETION NOT PRESERVE DISABLE ON SLAVE DO BEGIN
  	-- Verifica se o dia da semana está entre 2 e 6 (segunda a sexta)
	IF DAYOFWEEK(CURDATE()) BETWEEN 2 AND 6 THEN
		#CALL UpdateActivityPerformedDates;	
		#CALL UpdateTaskPerformedDates;	
		CALL CalculateActivityApprovalFY;
		CALL CalculateActivityEndFY;
		CALL CalculateTaskEndFY;
		CALL UpdateTaskForecast;
		CALL UpdateActivityBacklog;
		CALL UpdateTaskBacklog;
	END IF;
END */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
/*!50106 DROP EVENT IF EXISTS `ev_refresh_asset_snapshots` */;;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`pegasus`@`%`*/ /*!50106 EVENT `ev_refresh_asset_snapshots` ON SCHEDULE EVERY 1 DAY STARTS '2026-02-17 02:00:00' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
    CALL sp_refresh_tbAssetContractSummaryByCustomer();
    CALL sp_refresh_tbAssetContractEndMismatch();
	CALL sp_refresh_tbFarol();
	CALL sp_refresh_tbFarol_forCisco();
	CALL sp_refresh_tbClientFarol();
	CALL sp_SyncCiscoWebOrders;
END */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
DELIMITER ;
/*!50106 SET TIME_ZONE= @save_time_zone */ ;

--
-- Dumping routines for database 'pegasus'
--
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `CalculateActivityApprovalFY` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `CalculateActivityApprovalFY`()
BEGIN
	UPDATE tbTaskActivity
	SET
    	activity_approval_fy =
        	CASE
            	WHEN MONTH(activity_approval_date) >= 1 AND MONTH(activity_approval_date) <= 3 THEN YEAR(activity_approval_date) - 1
                ELSE YEAR(activity_approval_date)
            END
    WHERE
        activity_approval_date IS NOT NULL
        AND activity_approved <> 0;     
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `CalculateActivityEndFY` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `CalculateActivityEndFY`()
BEGIN
	UPDATE tbTaskActivity
	SET
    	activity_end_fy =
        	CASE
            	WHEN MONTH(activity_end) >= 1 AND MONTH(activity_end) <= 3 THEN YEAR(activity_end) - 1
                ELSE YEAR(activity_end)
            END
    WHERE
        activity_end IS NOT NULL  -- Condição 1: activity_end não é nulo
        AND activity_end_fy IS NULL;     -- Condição 1: activity_end_fy é nulo
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `CalculateTaskEndFY` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `CalculateTaskEndFY`()
BEGIN
	UPDATE tbTask
	SET
    	task_end_fy =
        	CASE
            	WHEN MONTH(task_end) >= 1 AND MONTH(task_end) <= 3 THEN YEAR(task_end) - 1
                ELSE YEAR(task_end)
            END
    WHERE
        task_end IS NOT NULL;  -- Condição 1: task_end não é nulo
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `CopyFromProductNameToProductPartNumber` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `CopyFromProductNameToProductPartNumber`()
BEGIN
UPDATE tbProduct
SET product_part_number = product_name
WHERE product_part_number IS NULL
  AND product_name IS NOT NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_refresh_tbAssetContractEndMismatch` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `sp_refresh_tbAssetContractEndMismatch`()
BEGIN
    CREATE TABLE IF NOT EXISTS tbAssetContractEndMismatch (
        asset_id INT NOT NULL,
        asset_serial_number VARCHAR(80) NULL,
        asset_instance_number VARCHAR(50) NULL,
        asset_subscription_id VARCHAR(100) NULL,
        asset_parent_level VARCHAR(20) NULL,
        asset_parent_serial_number VARCHAR(80) NULL,
        asset_parent_instance_number VARCHAR(50) NULL,
        product_id INT NULL,
        product_name VARCHAR(150) NULL,
        product_manufacturer_id INT NULL,
        product_manufacturer_name VARCHAR(255) NULL,
        product_family VARCHAR(100) NULL,
        product_group VARCHAR(100) NULL,
        product_subtype VARCHAR(100) NULL,
        vendorasset_contract_num VARCHAR(50) NULL,
        vendorasset_customer_id INT NULL,
        vendorasset_customer_name VARCHAR(255) NULL,
        nttasset_contract_number VARCHAR(12) NULL,
        nttasset_entitlement_id INT NULL,
        nttasset_entitlement_contract VARCHAR(255) NULL,
        nttasset_customer_id INT NULL,
        nttasset_customer_name VARCHAR(255) NULL,
        vendorasset_vendor_id INT NULL,
        vendorasset_vendor_name VARCHAR(255) NULL,
        vendorasset_start DATE NULL,
        vendorasset_end DATE NULL,
        nttasset_contract_start DATE NULL,
        nttasset_contract_end DATE NULL,
        end_date_diff_days INT NULL,
        start_date_diff_days INT NULL,
        customer_mismatch_flag TINYINT NULL,
        status_consolidated VARCHAR(10) NULL,
        alert_reason VARCHAR(30) NULL,
        product_eos DATE NULL,
        product_ldos DATE NULL,
        eos_status VARCHAR(30) NULL,
        ldos_status VARCHAR(30) NULL,
        refreshed_at DATETIME NOT NULL,
        KEY idx_asset (asset_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    TRUNCATE TABLE tbAssetContractEndMismatch;
    INSERT INTO tbAssetContractEndMismatch (
        asset_id, asset_serial_number, asset_instance_number, asset_subscription_id,
        asset_parent_level, asset_parent_serial_number, asset_parent_instance_number,
        product_id, product_name, product_manufacturer_id, product_manufacturer_name,
        product_family, product_group, product_subtype, 
        vendorasset_contract_num, vendorasset_customer_id, vendorasset_customer_name,
        nttasset_contract_number, nttasset_entitlement_id, nttasset_entitlement_contract,
        nttasset_customer_id, nttasset_customer_name,
        vendorasset_vendor_id, vendorasset_vendor_name,
        vendorasset_start, vendorasset_end,
        nttasset_contract_start, nttasset_contract_end,
        end_date_diff_days, start_date_diff_days,
        customer_mismatch_flag, status_consolidated, alert_reason,
        product_eos, product_ldos, eos_status, ldos_status, refreshed_at
    )
    SELECT
        a.asset_id,
        a.asset_serial_number,
        a.asset_instance_number,
        a.asset_subscription_id,
        a.asset_parent_level,
        a.asset_parent_serial_number,
        a.asset_parent_instance_number,
        p.product_id,
        p.product_name,
        p.product_manufacturer_id,
        cm.company_name,
        p.product_family,
        p.product_group,
        p.product_subtype,
        v.vendorasset_contract_num,
        v.vendorasset_customer_id,
        cv.company_name,
        n.nttasset_contract_number,
        n.nttasset_entitlement_id,
        e.entitlement_contract_name,
        n.nttasset_customer_id,
        cn.company_name,
        v.vendorasset_vendor_id,
        cc.company_name,
        v.vendorasset_start,
        v.vendorasset_end,
        n.nttasset_contract_start,
        n.nttasset_contract_end,
        DATEDIFF(v.vendorasset_end, n.nttasset_contract_end),
        DATEDIFF(v.vendorasset_start, n.nttasset_contract_start),
        CASE
            WHEN v.vendorasset_customer_id <> n.nttasset_customer_id THEN 1
            ELSE 0
        END,
        CASE
            WHEN v.vendorasset_end <> n.nttasset_contract_end THEN 'CRITICAL'
            WHEN v.vendorasset_customer_id <> n.nttasset_customer_id THEN 'ALERT'
            ELSE 'OK'
        END,
        NULL, -- alert_reason simplificado (mantive estrutura enxuta)
        p.product_endofsale,
        p.product_endofsupport,
        NULL,
        NULL,
        NOW()
    FROM tbAsset a
    LEFT JOIN tbProduct p ON p.product_id = a.asset_product_id
    LEFT JOIN tbCompany cm ON p.product_manufacturer_id = cm.company_id
    LEFT JOIN (
        SELECT t.*
        FROM tbContractVendorAsset t
        JOIN (
            SELECT vendorasset_asset_id, MAX(vendorasset_end) max_end
            FROM tbContractVendorAsset
            GROUP BY vendorasset_asset_id
        ) m
        ON m.vendorasset_asset_id = t.vendorasset_asset_id
        AND m.max_end = t.vendorasset_end
    ) v ON v.vendorasset_asset_id = a.asset_id
    LEFT JOIN (
        SELECT t.*
        FROM tbContractNTTAsset t
        JOIN (
            SELECT nttasset_asset_id, MAX(nttasset_contract_end) max_end
            FROM tbContractNTTAsset
            GROUP BY nttasset_asset_id
        ) m
        ON m.nttasset_asset_id = t.nttasset_asset_id
        AND m.max_end = t.nttasset_contract_end
    ) n ON n.nttasset_asset_id = a.asset_id
    LEFT JOIN tbEntitlement e ON n.nttasset_entitlement_id = e.entitlement_id
    LEFT JOIN tbCompany cv ON v.vendorasset_customer_id = cv.company_id
    LEFT JOIN tbCompany cn ON n.nttasset_customer_id = cn.company_id
    LEFT JOIN tbCompany cc ON v.vendorasset_vendor_id = cc.company_id
    WHERE v.vendorasset_end IS NOT NULL
       OR n.nttasset_contract_end IS NOT NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_refresh_tbAssetContractSummaryByCustomer` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `sp_refresh_tbAssetContractSummaryByCustomer`()
BEGIN
	/* Garante que a tabela exista */
	CREATE TABLE IF NOT EXISTS tbAssetContractSummaryByCustomer (
	customer_id INT NOT NULL,
	customer_name VARCHAR(255) NULL,
	total_assets INT NOT NULL,
	vendor_end_only_count INT NOT NULL,
	vendor_end_only_percent DECIMAL(6,2) NOT NULL,
	ntt_end_only_count INT NOT NULL,
	ntt_end_only_percent DECIMAL(6,2) NOT NULL,
	both_end_count INT NOT NULL,
	both_end_percent DECIMAL(6,2) NOT NULL,
	refreshed_at DATETIME NOT NULL,
	PRIMARY KEY (customer_id),
	KEY idx_company_name (company_name)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
	/* Limpa dados antigos */
	TRUNCATE TABLE tbAssetContractSummaryByCustomer;
	/* Recalcula snapshot */
	INSERT INTO tbAssetContractSummaryByCustomer (customer_id,customer_name,total_assets,vendor_end_only_count,vendor_end_only_percent,ntt_end_only_count,ntt_end_only_percent,both_end_count,both_end_percent,refreshed_at)
	SELECT
	s.customer_id,
	c.company_name,
	COUNT(1),
	SUM(CASE WHEN s.has_vendor_end=1 AND s.has_ntt_end=0 THEN 1 ELSE 0 END),
	ROUND(100*SUM(CASE WHEN s.has_vendor_end=1 AND s.has_ntt_end=0 THEN 1 ELSE 0 END)/NULLIF(COUNT(1),0),2),
	SUM(CASE WHEN s.has_ntt_end=1 AND s.has_vendor_end=0 THEN 1 ELSE 0 END),
	ROUND(100*SUM(CASE WHEN s.has_ntt_end=1 AND s.has_vendor_end=0 THEN 1 ELSE 0 END)/NULLIF(COUNT(1),0),2),
	SUM(CASE WHEN s.has_vendor_end=1 AND s.has_ntt_end=1 THEN 1 ELSE 0 END),
	ROUND(100*SUM(CASE WHEN s.has_vendor_end=1 AND s.has_ntt_end=1 THEN 1 ELSE 0 END)/NULLIF(COUNT(1),0),2),
	NOW()
	FROM (
	SELECT
	ids.asset_id,
	COALESCE(n.customer_id,v.customer_id) AS customer_id,
	CASE WHEN v.vendor_end IS NOT NULL THEN 1 ELSE 0 END AS has_vendor_end,
	CASE WHEN n.ntt_end IS NOT NULL THEN 1 ELSE 0 END AS has_ntt_end
	FROM (
	SELECT asset_id FROM (
	SELECT vendorasset_asset_id AS asset_id FROM tbContractVendorAsset WHERE vendorasset_end IS NOT NULL
	UNION
	SELECT nttasset_asset_id AS asset_id FROM tbContractNTTAsset WHERE nttasset_contract_end IS NOT NULL
	) x
	) ids
	LEFT JOIN (
	SELECT vendorasset_asset_id AS asset_id,vendorasset_customer_id AS customer_id,vendorasset_end AS vendor_end
	FROM tbContractVendorAsset
	WHERE vendorasset_end IS NOT NULL
	) v ON v.asset_id=ids.asset_id
	LEFT JOIN (
	SELECT nttasset_asset_id AS asset_id,nttasset_customer_id AS customer_id,nttasset_contract_end AS ntt_end
	FROM tbContractNTTAsset
	WHERE nttasset_contract_end IS NOT NULL
	) n ON n.asset_id=ids.asset_id
	WHERE COALESCE(n.customer_id,v.customer_id) IS NOT NULL
	) s
	JOIN tbCompany c ON c.company_id=s.customer_id
	GROUP BY s.customer_id,c.company_name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_refresh_tbClientFarol` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `sp_refresh_tbClientFarol`()
BEGIN
	CREATE TABLE IF NOT EXISTS tbClientFarol (
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	vendor_id INT NOT NULL,
	customer_id INT NOT NULL,
	customer_name VARCHAR(255) NULL,
	refreshed_at DATETIME NOT NULL,
	KEY idx_vendor_customer (vendor_id, customer_id),
	KEY idx_customer_name (customer_name)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
	TRUNCATE TABLE tbClientFarol;
	INSERT INTO tbClientFarol (vendor_id,customer_id,customer_name,refreshed_at)
	SELECT DISTINCT
		vendor_id,
		customer_id,
		customer_name,
		NOW() AS refreshed_at
	FROM tbFarol
	GROUP BY
		vendor_id,
		customer_id,
		customer_name
	ORDER BY customer_name ASC;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_refresh_tbFarol` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `sp_refresh_tbFarol`()
BEGIN
	CREATE TABLE IF NOT EXISTS tbFarol (
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	vendor_id INT NOT NULL,
	architecture VARCHAR(100) NOT NULL,
	solution VARCHAR(100) NOT NULL,
	product_name VARCHAR(200) NULL,
	customer_id INT NULL,
	customer_name VARCHAR(255) NULL,
	status VARCHAR(20) NULL,
	farol VARCHAR(255) NULL,
	refreshed_at DATETIME NOT NULL,
	KEY idx_customer_name (customer_name),
	KEY idx_status (status)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
	TRUNCATE TABLE tbFarol;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_refresh_tbFarol_forCisco` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `sp_refresh_tbFarol_forCisco`()
BEGIN
	INSERT INTO tbFarol (vendor_id,architecture,solution,product_name,customer_id,customer_name,status,farol,refreshed_at)
	/* Lista todos os produtos (vendor=1) x todos os clientes (que aparecem em tbContractVendorAsset)
	   e indica para cada par se o cliente possui o produto e qual o status (green/red/yellow) ou 'gray' caso não possua.
	*/
	SELECT
	  1 AS vendor_id,
	  UPPER(p.product_business_entity) AS architecture,
	  UPPER(p.product_subbusiness_entity) AS solution,
	  p.product_name,
	  c.customer_id,
	  comp.company_name AS customer_name,
	  /* status_code: gray (cliente não possui o produto) ou green/red/yellow (agregado por max end) */
	  COALESCE(cv.max_date_status, 'gray') AS status_code,
	  /* rótulo legível */
	  CASE
	    WHEN COALESCE(cv.max_date_status, 'gray') = 'green' THEN 'Active'
	    WHEN COALESCE(cv.max_date_status, 'gray') = 'gray'  THEN 'Non-Existent or Other Partner'
	    WHEN COALESCE(cv.max_date_status, 'gray') = 'yellow' THEN 'Signed – Pending Activation'
	    WHEN COALESCE(cv.max_date_status, 'gray') = 'red'   THEN 'Expired or Never Covered'
	    ELSE NULL
	  END AS farol,
	  NOW()
	FROM
	  /* 1) todos os produtos válidos */
	  (SELECT product_id, product_name, product_business_entity, product_subbusiness_entity
	   FROM tbProduct
	   WHERE product_vendor_id = 1
	     AND product_business_entity IS NOT NULL
	     AND product_subbusiness_entity IS NOT NULL
	  ) p
	CROSS JOIN
	  /* 2) lista de clientes relevantes (aparecem em contratos vendor) */
	  (SELECT DISTINCT vendorasset_customer_id AS customer_id
	   FROM tbContractVendorAsset
	   WHERE vendorasset_customer_id IS NOT NULL
	     AND vendorasset_customer_id <> 0
	  ) c
	LEFT JOIN
	  /* 3) company name (opcional) */
	  tbCompany comp ON comp.company_id = c.customer_id
	LEFT JOIN
	  /* 4) agregação por cliente + produto: associa contratos -> asset -> product e calcula max end */
	  (
	    SELECT
	      t.vendorasset_customer_id AS customer_id,
	      a.asset_product_id AS product_id,
	      MAX(t.vendorasset_end) AS max_end,
	      CASE
	        WHEN MAX(t.vendorasset_end) >= CURRENT_DATE THEN 'green'
	        WHEN MAX(t.vendorasset_end) <  CURRENT_DATE THEN 'red'
	        WHEN MAX(t.vendorasset_end) IS NULL           THEN 'yellow'
	        ELSE 'yellow'
	      END AS max_date_status
	    FROM tbContractVendorAsset t
	    INNER JOIN tbAsset a ON t.vendorasset_asset_id = a.asset_id     -- 2.1 join
	    -- a.asset_product_id = p.product_id (logical; here we group by product_id)
	    WHERE t.vendorasset_vendor_id = 1
	      AND t.vendorasset_customer_id IS NOT NULL
	      AND t.vendorasset_customer_id <> 0
	    GROUP BY t.vendorasset_customer_id, a.asset_product_id
	  ) cv
	  ON cv.product_id = p.product_id
	  AND cv.customer_id = c.customer_id
	ORDER BY p.product_id, comp.company_name;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_SyncCiscoWebOrders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `sp_SyncCiscoWebOrders`()
BEGIN
    -- Inserindo registros válidos da tbCiscoEA que não existem no destino
    INSERT INTO tbCiscoWebOrder (weborder, customer_id)
    SELECT 
        src.ea_web_order_id, 
        src.ea_end_customer
    FROM (
        -- Selecionamos apenas o que NÃO é nulo e agrupamos
        SELECT ea_web_order_id, ea_end_customer 
        FROM tbCiscoEA 
        WHERE ea_web_order_id IS NOT NULL 
          AND ea_end_customer IS NOT NULL
        GROUP BY ea_web_order_id, ea_end_customer
    ) AS src
    LEFT JOIN tbCiscoWebOrder AS dest 
        ON src.ea_web_order_id = dest.weborder 
        AND src.ea_end_customer = dest.customer_id
    WHERE dest.weborder IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `UpdateActivityBacklog` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `UpdateActivityBacklog`()
BEGIN
  UPDATE tbTaskActivity a
  SET a.activity_backlog_value =
    CASE
      WHEN a.activity_status IN (4,5,6,9,10) THEN 0
      ELSE GREATEST(
             COALESCE(a.activity_value, 0) - COALESCE(a.activity_approved_value, 0),
             0
           )
    END;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `UpdateActivityPerformedDates` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `UpdateActivityPerformedDates`()
BEGIN
  -- Preenche start_performed quando houver start e estiver diferente/NULL
  UPDATE pegasus.tbTaskActivity
  SET activity_start_performed = activity_start
  WHERE activity_start IS NOT NULL
    AND activity_start_performed IS NULL;

  -- Preenche end_performed quando houver end e estiver diferente/NULL
  UPDATE pegasus.tbTaskActivity
  SET activity_end_performed = activity_end
  WHERE activity_end IS NOT NULL
    AND activity_end_performed IS NULL;
  
  -- Ajustar end_performed quando houver approval_date
  UPDATE pegasus.tbTaskActivity
    SET activity_end_performed = activity_approval_date
    WHERE activity_approval_date IS NOT NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `UpdateTaskBacklog` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `UpdateTaskBacklog`()
BEGIN
  UPDATE tbTask t
  LEFT JOIN (
    SELECT a.activity_task_id,
           IFNULL(SUM(a.activity_value),0) AS backlog_sum
    FROM tbTaskActivity a
    WHERE a.activity_status IN (1,2,3,7,8)
      AND a.activity_value > 0
      AND a.activity_approved = 0
    GROUP BY a.activity_task_id
  ) x ON x.activity_task_id = t.task_id
  SET t.task_backlog =
	CASE
		WHEN t.task_status IN (4,5,6,9,10) THEN 0
		ELSE IFNULL(x.backlog_sum, 0)
	END;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `UpdateTaskForecast` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `UpdateTaskForecast`()
BEGIN
    -- Atualiza todos os registros da tabela tbTask com a soma dos valores aprovados
    UPDATE tbTask t
    SET t.task_forecast = (
        SELECT IFNULL(SUM(a.activity_approved_value), 0)
        FROM tbTaskActivity a
        WHERE a.activity_task_id = t.task_id
    );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `UpdateTaskPerformedDates` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `UpdateTaskPerformedDates`()
BEGIN
  UPDATE tbTask t
  LEFT JOIN (
    SELECT
      a.activity_task_id,
      MIN(a.activity_start_performed) AS min_start_performed,
      MAX(a.activity_end_performed)   AS max_end_performed
    FROM tbTaskActivity a
    GROUP BY a.activity_task_id
  ) x
    ON x.activity_task_id = t.task_id
  SET
    t.task_start_performed = COALESCE(x.min_start_performed, t.task_start_performed),
    t.task_end_performed   = COALESCE(x.max_end_performed, t.task_end_performed);	
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'IGNORE_SPACE,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50003 DROP PROCEDURE IF EXISTS `UpdateTaskRACIType` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
DELIMITER ;;
CREATE DEFINER=`pegasus`@`%` PROCEDURE `UpdateTaskRACIType`()
BEGIN
  UPDATE tbTaskRACI
  SET taskraci_stakeholder_type =
    CASE
      WHEN LOWER(taskraci_stakeholder_name) LIKE '%external%' THEN 'EXTERNAL'
      WHEN LOWER(taskraci_stakeholder_name) LIKE '%ntt%' THEN 'INTERNAL'
      ELSE taskraci_stakeholder_type
    END;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `vwAccountTeam`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeam`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeam` AS select `tat`.`accountteam_id` AS `accountteam_id`,`tat`.`accountteam_company_id` AS `accountteam_company_id`,`tat`.`accountteam_user_id` AS `accountteam_user_id`,`tat`.`accountteam_user_type` AS `accountteam_user_type`,`tat`.`accountteam_allocation_start_date` AS `accountteam_allocation_start_date`,`tat`.`accountteam_allocation_end_date` AS `accountteam_allocation_end_date`,`tat`.`accountteam_allocated` AS `accountteam_allocated`,`tat`.`accountteam_changed_in` AS `accountteam_changed_in`,`tat`.`accountteam_changed_by` AS `accountteam_changed_by`,`tu`.`user_name` AS `accountteam_user_name`,`tc`.`company_name` AS `accountteam_company_name` from ((`tbAccountTeam` `tat` join `tbUser` `tu` on(`tat`.`accountteam_user_id` = `tu`.`user_id`)) join `tbCompany` `tc` on(`tat`.`accountteam_company_id` = `tc`.`company_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamCSM`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamCSM`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamCSM` AS select `at`.`accountteam_user_id` AS `csm_id`,`uc`.`user_name` AS `csm_name`,`at`.`accountteam_company_id` AS `client_id`,`c`.`company_name` AS `client_name`,`am`.`accountteam_user_id` AS `am_id`,`ua`.`user_name` AS `am_name`,case when exists(select 1 from `tbCiscoEnterpriseAgreementMetering` `m` where `m`.`mcea_client_id` = `at`.`accountteam_company_id` limit 1) then 'Y' else 'N' end AS `CiscoEA`,`c`.`company_type` AS `client_type` from ((((`tbAccountTeam` `at` join `tbCompany` `c` on(`at`.`accountteam_company_id` = `c`.`company_id`)) join `tbUser` `uc` on(`at`.`accountteam_user_id` = `uc`.`user_id`)) left join (select min(`x`.`accountteam_id`) AS `MIN(``x``.``accountteam_id``)`,`x`.`accountteam_company_id` AS `accountteam_company_id`,`x`.`accountteam_user_id` AS `accountteam_user_id` from `tbAccountTeam` `x` where `x`.`accountteam_user_type` = 'AM' and `x`.`accountteam_allocated` <> 0 group by `x`.`accountteam_company_id`) `am` on(`at`.`accountteam_company_id` = `am`.`accountteam_company_id`)) left join `tbUser` `ua` on(`am`.`accountteam_user_id` = `ua`.`user_id`)) where `at`.`accountteam_allocated` <> 0 and `at`.`accountteam_user_type` = 'CSM' group by `at`.`accountteam_company_id`,`at`.`accountteam_user_id`,`c`.`company_name`,`c`.`company_type`,`uc`.`user_name`,`ua`.`user_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamCSMCountByAM`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamCSMCountByAM`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamCSMCountByAM` AS select `am`.`accountteam_user_id` AS `am_id`,`uam`.`user_name` AS `am_name`,`csm`.`accountteam_user_id` AS `csm_id`,`ucsm`.`user_name` AS `csm_name`,count(distinct `csm`.`accountteam_id`) AS `count_csm` from (((`tbAccountTeam` `am` join `tbAccountTeam` `csm` on(`am`.`accountteam_company_id` = `csm`.`accountteam_company_id` and `csm`.`accountteam_allocated` <> 0 and `csm`.`accountteam_user_type` = 'CSM')) join `tbUser` `uam` on(`am`.`accountteam_user_id` = `uam`.`user_id`)) join `tbUser` `ucsm` on(`csm`.`accountteam_user_id` = `ucsm`.`user_id`)) where `am`.`accountteam_user_type` = 'AM' and `am`.`accountteam_allocated` <> 0 group by `am`.`accountteam_user_id`,`csm`.`accountteam_user_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamCiscoEANoCSM`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamCiscoEANoCSM`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamCiscoEANoCSM` AS select `e`.`ea_end_customer_id` AS `company_id`,`c`.`company_name` AS `company_name` from (`tbCiscoEA` `e` join `tbCompany` `c` on(`e`.`ea_end_customer_id` = `c`.`company_id`)) where !(`e`.`ea_end_customer_id` in (select `tbAccountTeam`.`accountteam_company_id` from `tbAccountTeam` where `tbAccountTeam`.`accountteam_user_type` = 'CSM' and `tbAccountTeam`.`accountteam_allocated` <> 0 group by `tbAccountTeam`.`accountteam_company_id`)) group by `e`.`ea_end_customer_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamCustomerScore`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamCustomerScore`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamCustomerScore` AS select `n`.`company_id` AS `company_id`,`n`.`company_name` AS `company_name`,`n`.`company_type` AS `company_current_level`,`n`.`company_vertical` AS `company_vertical`,coalesce(`team`.`has_csm`,'N') AS `has_csm`,`team`.`csm_id` AS `csm_id`,`team`.`csm_name` AS `csm_name`,coalesce(`team`.`has_cdm`,'N') AS `has_cdm`,`team`.`cdm_id` AS `cdm_id`,`team`.`cdm_name` AS `cdm_name`,`team`.`am_id` AS `am_id`,`team`.`am_name` AS `am_name`,`team`.`dir_id` AS `dir_id`,`team`.`dir_name` AS `dir_name`,round(coalesce(`mrr`.`total_active_mrr`,0),2) AS `total_active_mrr`,least(case when coalesce(`team`.`has_cdm`,'N') = 'Y' then 1 else 0 end + case when coalesce(`mrr`.`total_active_mrr`,0) = 0 then 0 when coalesce(`mrr`.`total_active_mrr`,0) < 50000 then 1 when coalesce(`mrr`.`total_active_mrr`,0) between 50000 and 400000 then 2 else 3 end,3) AS `customer_score`,case least(case when coalesce(`team`.`has_cdm`,'N') = 'Y' then 1 else 0 end + case when coalesce(`mrr`.`total_active_mrr`,0) = 0 then 0 when coalesce(`mrr`.`total_active_mrr`,0) < 50000 then 1 when coalesce(`mrr`.`total_active_mrr`,0) between 50000 and 400000 then 2 else 3 end,3) when 0 then 'LOW' when 1 then 'LOW' when 2 then 'MEDIUM' else 'HIGH' end AS `customer_level`,coalesce(`opp`.`opportunity_amount_total_12m`,0) AS `opportunity_amount_total_12m`,coalesce(`opp`.`opportunity_amount_deal_lost_12m`,0) AS `opportunity_amount_deal_lost_12m`,coalesce(`opp`.`opportunity_amount_identification_12m`,0) AS `opportunity_amount_identification_12m`,coalesce(`opp`.`opportunity_amount_finalist_12m`,0) AS `opportunity_amount_finalist_12m`,coalesce(`opp`.`opportunity_amount_proposal_evaluation_12m`,0) AS `opportunity_amount_proposal_evaluation_12m`,coalesce(`opp`.`opportunity_amount_deal_won_12m`,0) AS `opportunity_amount_deal_won_12m`,coalesce(`opp`.`opportunity_amount_proposal_12m`,0) AS `opportunity_amount_proposal_12m`,coalesce(`opp`.`opportunity_amount_qualification_12m`,0) AS `opportunity_amount_qualification_12m`,coalesce(`opp`.`opportunity_amount_requirements_definition_12m`,0) AS `opportunity_amount_requirements_definition_12m` from (((`tbCompany` `n` left join (select `at`.`accountteam_company_id` AS `company_id`,max(case when `at`.`accountteam_user_type` = 'CSM' and `at`.`accountteam_allocated` <> 0 then 'Y' else 'N' end) AS `has_csm`,max(case when `at`.`accountteam_user_type` = 'CDM' and `at`.`accountteam_allocated` <> 0 then 'Y' else 'N' end) AS `has_cdm`,min(case when `at`.`accountteam_user_type` = 'CSM' and `at`.`accountteam_allocated` <> 0 then `u`.`user_id` end) AS `csm_id`,min(case when `at`.`accountteam_user_type` = 'CSM' and `at`.`accountteam_allocated` <> 0 then `u`.`user_name` end) AS `csm_name`,min(case when `at`.`accountteam_user_type` = 'CDM' and `at`.`accountteam_allocated` <> 0 then `u`.`user_id` end) AS `cdm_id`,min(case when `at`.`accountteam_user_type` = 'CDM' and `at`.`accountteam_allocated` <> 0 then `u`.`user_name` end) AS `cdm_name`,min(case when `at`.`accountteam_user_type` = 'AM' and `at`.`accountteam_allocated` <> 0 then `u`.`user_id` end) AS `am_id`,min(case when `at`.`accountteam_user_type` = 'AM' and `at`.`accountteam_allocated` <> 0 then `u`.`user_name` end) AS `am_name`,min(case when `at`.`accountteam_user_type` = 'DIR' and `at`.`accountteam_allocated` <> 0 then `u`.`user_id` end) AS `dir_id`,min(case when `at`.`accountteam_user_type` = 'DIR' and `at`.`accountteam_allocated` <> 0 then `u`.`user_name` end) AS `dir_name` from (`tbAccountTeam` `at` left join `tbUser` `u` on(`u`.`user_id` = `at`.`accountteam_user_id`)) group by `at`.`accountteam_company_id`) `team` on(`team`.`company_id` = `n`.`company_id`)) left join (select `t`.`customer_id` AS `customer_id`,sum(`t`.`contract_mrr`) AS `total_active_mrr` from (select `c`.`nttasset_customer_id` AS `customer_id`,`c`.`nttasset_contract_number` AS `nttasset_contract_number`,min(`c`.`nttasset_contract_start`) AS `contract_start_date`,max(`c`.`nttasset_contract_end`) AS `contract_end_date`,max(`c`.`nttasset_contract_amount`) AS `contract_amount`,timestampdiff(MONTH,min(`c`.`nttasset_contract_start`),max(`c`.`nttasset_contract_end`)) + 1 AS `contract_months`,case when timestampdiff(MONTH,min(`c`.`nttasset_contract_start`),max(`c`.`nttasset_contract_end`)) + 1 > 0 then max(`c`.`nttasset_contract_amount`) / (timestampdiff(MONTH,min(`c`.`nttasset_contract_start`),max(`c`.`nttasset_contract_end`)) + 1) else 0 end AS `contract_mrr`,case when max(`c`.`nttasset_contract_end`) < curdate() then 'EXPIRED' else 'ACTIVE' end AS `contract_status` from `tbContractNTTAsset` `c` group by `c`.`nttasset_customer_id`,`c`.`nttasset_contract_number`,`c`.`nttasset_contract_start`,`c`.`nttasset_contract_end`,`c`.`nttasset_contract_amount`) `t` where `t`.`contract_status` = 'ACTIVE' group by `t`.`customer_id`) `mrr` on(`mrr`.`customer_id` = `n`.`company_id`)) left join (select `t`.`opportunity_customer_id` AS `opportunity_customer_id`,coalesce(sum(`t`.`amount_brl`),0) AS `opportunity_amount_total_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Deal Lost' then `t`.`amount_brl` end),0) AS `opportunity_amount_deal_lost_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Identification' then `t`.`amount_brl` end),0) AS `opportunity_amount_identification_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Finalist' then `t`.`amount_brl` end),0) AS `opportunity_amount_finalist_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Proposal Evaluation' then `t`.`amount_brl` end),0) AS `opportunity_amount_proposal_evaluation_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Deal Won' then `t`.`amount_brl` end),0) AS `opportunity_amount_deal_won_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Proposal' then `t`.`amount_brl` end),0) AS `opportunity_amount_proposal_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Qualification' then `t`.`amount_brl` end),0) AS `opportunity_amount_qualification_12m`,coalesce(sum(case when `t`.`opportunity_stage` in ('Requirements Definition','Requirements Definit') then `t`.`amount_brl` end),0) AS `opportunity_amount_requirements_definition_12m` from (select `o`.`opportunity_num` AS `opportunity_num`,`o`.`opportunity_customer_id` AS `opportunity_customer_id`,`o`.`opportunity_stage` AS `opportunity_stage`,case when month(`o`.`opportunity_close_date`) >= 4 then year(`o`.`opportunity_close_date`) else year(`o`.`opportunity_close_date`) - 1 end AS `fiscal_year`,sum(case when `o`.`opportunity_currency` = 'USD' then `o`.`opportunity_amount` * coalesce(`r`.`rate_value`,0) else `o`.`opportunity_amount` end) AS `amount_brl` from (`tbOpportunity` `o` left join `tbCurrencyRate` `r` on(`r`.`rate_currency` = 'USD' and `r`.`rate_fiscalyear` = case when month(`o`.`opportunity_close_date`) >= 4 then year(`o`.`opportunity_close_date`) else year(`o`.`opportunity_close_date`) - 1 end)) where `o`.`opportunity_close_date` >= curdate() - interval 12 month and `o`.`opportunity_create_date` <= curdate() group by `o`.`opportunity_num`,`o`.`opportunity_customer_id`,`o`.`opportunity_stage`) `t` group by `t`.`opportunity_customer_id`) `opp` on(`opp`.`opportunity_customer_id` = `n`.`company_id`)) where coalesce(`team`.`has_csm`,'N') = 'Y' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamFrequentCSMperAM`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamFrequentCSMperAM`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamFrequentCSMperAM` AS with pair_counts as (select `am`.`accountteam_user_id` AS `am_id`,`csm`.`accountteam_user_id` AS `csm_id`,count(0) AS `qty` from (`tbAccountTeam` `am` join `tbAccountTeam` `csm` on(`am`.`accountteam_company_id` = `csm`.`accountteam_company_id`)) where `am`.`accountteam_user_type` = 'AM' and `am`.`accountteam_allocated` <> 0 and `csm`.`accountteam_user_type` = 'CSM' and `csm`.`accountteam_allocated` <> 0 group by `am`.`accountteam_user_id`,`csm`.`accountteam_user_id`), ranked as (select `pc`.`am_id` AS `am_id`,`pc`.`csm_id` AS `csm_id`,`pc`.`qty` AS `qty`,row_number() over ( partition by `pc`.`am_id` order by `pc`.`qty` desc) AS `rn` from `pair_counts` `pc`)select `r`.`am_id` AS `am_id`,`u_am`.`user_name` AS `am_name`,`r`.`csm_id` AS `csm_id`,`u_csm`.`user_name` AS `csm_name`,`r`.`qty` AS `occurrences`,`r`.`rn` AS `rank_pos` from ((`ranked` `r` left join `tbUser` `u_am` on(`u_am`.`user_id` = `r`.`am_id`)) left join `tbUser` `u_csm` on(`u_csm`.`user_id` = `r`.`csm_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamMostFrequentAMperCSM`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentAMperCSM`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamMostFrequentAMperCSM` AS select `r`.`csm_id` AS `csm_id`,`u_csm`.`user_name` AS `csm_name`,`r`.`am_id` AS `am_id`,`u_am`.`user_name` AS `am_name`,`r`.`qty` AS `occurrences` from (((select `pc`.`csm_id` AS `csm_id`,`pc`.`am_id` AS `am_id`,`pc`.`qty` AS `qty`,row_number() over ( partition by `pc`.`csm_id` order by `pc`.`qty` desc) AS `rn` from (select `am`.`accountteam_user_id` AS `am_id`,`csm`.`accountteam_user_id` AS `csm_id`,count(0) AS `qty` from (`tbAccountTeam` `am` join `tbAccountTeam` `csm` on(`am`.`accountteam_company_id` = `csm`.`accountteam_company_id`)) where `am`.`accountteam_user_type` = 'AM' and `am`.`accountteam_allocated` <> 0 and `csm`.`accountteam_user_type` = 'CSM' and `csm`.`accountteam_allocated` <> 0 group by `am`.`accountteam_user_id`,`csm`.`accountteam_user_id`) `pc`) `r` left join `tbUser` `u_am` on(`u_am`.`user_id` = `r`.`am_id`)) left join `tbUser` `u_csm` on(`u_csm`.`user_id` = `r`.`csm_id`)) where `r`.`rn` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamMostFrequentCSMperAM`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentCSMperAM`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamMostFrequentCSMperAM` AS with pair_counts as (select `am`.`accountteam_user_id` AS `am_id`,`csm`.`accountteam_user_id` AS `csm_id`,count(0) AS `qty` from (`tbAccountTeam` `am` join `tbAccountTeam` `csm` on(`am`.`accountteam_company_id` = `csm`.`accountteam_company_id`)) where `am`.`accountteam_user_type` = 'AM' and `am`.`accountteam_allocated` <> 0 and `csm`.`accountteam_user_type` = 'CSM' and `csm`.`accountteam_allocated` <> 0 group by `am`.`accountteam_user_id`,`csm`.`accountteam_user_id`), ranked as (select `pc`.`am_id` AS `am_id`,`pc`.`csm_id` AS `csm_id`,`pc`.`qty` AS `qty`,row_number() over ( partition by `pc`.`am_id` order by `pc`.`qty` desc) AS `rn` from `pair_counts` `pc`)select `r`.`am_id` AS `am_id`,`u_am`.`user_name` AS `am_name`,`r`.`csm_id` AS `csm_id`,`u_csm`.`user_name` AS `csm_name`,`r`.`qty` AS `occurrences` from ((`ranked` `r` left join `tbUser` `u_am` on(`u_am`.`user_id` = `r`.`am_id`)) left join `tbUser` `u_csm` on(`u_csm`.`user_id` = `r`.`csm_id`)) where `r`.`rn` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamMostFrequentCSMperAMTop3`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentCSMperAMTop3`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamMostFrequentCSMperAMTop3` AS select `r`.`am_id` AS `am_id`,`u_am`.`user_name` AS `am_name`,`r`.`csm_id` AS `csm_id`,`u_csm`.`user_name` AS `csm_name`,`r`.`qty` AS `occurrences`,`r`.`rn` AS `csm_rank_for_am` from (((select `pc`.`am_id` AS `am_id`,`pc`.`csm_id` AS `csm_id`,`pc`.`qty` AS `qty`,row_number() over ( partition by `pc`.`am_id` order by `pc`.`qty` desc) AS `rn` from (select `am`.`accountteam_user_id` AS `am_id`,`csm`.`accountteam_user_id` AS `csm_id`,count(0) AS `qty` from (`tbAccountTeam` `am` join `tbAccountTeam` `csm` on(`am`.`accountteam_company_id` = `csm`.`accountteam_company_id`)) where `am`.`accountteam_user_type` = 'AM' and `am`.`accountteam_allocated` <> 0 and `csm`.`accountteam_user_type` = 'CSM' and `csm`.`accountteam_allocated` <> 0 group by `am`.`accountteam_user_id`,`csm`.`accountteam_user_id`) `pc`) `r` left join `tbUser` `u_am` on(`u_am`.`user_id` = `r`.`am_id`)) left join `tbUser` `u_csm` on(`u_csm`.`user_id` = `r`.`csm_id`)) where `r`.`rn` <= 3 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamMostFrequentCSMperDIR`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentCSMperDIR`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamMostFrequentCSMperDIR` AS with pair_counts as (select `dir`.`accountteam_user_id` AS `dir_id`,`csm`.`accountteam_user_id` AS `csm_id`,count(0) AS `qty` from (`tbAccountTeam` `dir` join `tbAccountTeam` `csm` on(`dir`.`accountteam_company_id` = `csm`.`accountteam_company_id`)) where `dir`.`accountteam_user_type` = 'DIR' and `dir`.`accountteam_allocated` <> 0 and `csm`.`accountteam_user_type` = 'CSM' and `csm`.`accountteam_allocated` <> 0 group by `dir`.`accountteam_user_id`,`csm`.`accountteam_user_id`), ranked as (select `pc`.`dir_id` AS `dir_id`,`pc`.`csm_id` AS `csm_id`,`pc`.`qty` AS `qty`,row_number() over ( partition by `pc`.`dir_id` order by `pc`.`qty` desc) AS `rn` from `pair_counts` `pc`)select `r`.`dir_id` AS `dir_id`,`u_dir`.`user_name` AS `dir_name`,`r`.`csm_id` AS `csm_id`,`u_csm`.`user_name` AS `csm_name`,`r`.`qty` AS `occurrences` from ((`ranked` `r` left join `tbUser` `u_dir` on(`u_dir`.`user_id` = `r`.`dir_id`)) left join `tbUser` `u_csm` on(`u_csm`.`user_id` = `r`.`csm_id`)) where `r`.`rn` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAccountTeamMostFrequentCSMperDIRTop3`
--

/*!50001 DROP VIEW IF EXISTS `vwAccountTeamMostFrequentCSMperDIRTop3`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAccountTeamMostFrequentCSMperDIRTop3` AS select `r`.`dir_id` AS `dir_id`,`u_dir`.`user_name` AS `dir_name`,`r`.`csm_id` AS `csm_id`,`u_csm`.`user_name` AS `csm_name`,`r`.`qty` AS `occurrences`,`r`.`rn` AS `csm_rank_for_dir` from (((select `pc`.`dir_id` AS `dir_id`,`pc`.`csm_id` AS `csm_id`,`pc`.`qty` AS `qty`,row_number() over ( partition by `pc`.`dir_id` order by `pc`.`qty` desc) AS `rn` from (select `dir`.`accountteam_user_id` AS `dir_id`,`csm`.`accountteam_user_id` AS `csm_id`,count(0) AS `qty` from (`tbAccountTeam` `dir` join `tbAccountTeam` `csm` on(`dir`.`accountteam_company_id` = `csm`.`accountteam_company_id`)) where `dir`.`accountteam_user_type` = 'DIR' and `dir`.`accountteam_allocated` <> 0 and `csm`.`accountteam_user_type` = 'CSM' and `csm`.`accountteam_allocated` <> 0 group by `dir`.`accountteam_user_id`,`csm`.`accountteam_user_id`) `pc`) `r` left join `tbUser` `u_dir` on(`u_dir`.`user_id` = `r`.`dir_id`)) left join `tbUser` `u_csm` on(`u_csm`.`user_id` = `r`.`csm_id`)) where `r`.`rn` <= 3 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAssetContractEndMismatch`
--

/*!50001 DROP VIEW IF EXISTS `vwAssetContractEndMismatch`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAssetContractEndMismatch` AS select `a`.`asset_id` AS `asset_id`,`a`.`asset_serial_number` AS `asset_serial_number`,`a`.`asset_instance_number` AS `asset_instance_number`,`a`.`asset_subscription_id` AS `asset_subscription_id`,`a`.`asset_parent_level` AS `asset_parent_level`,`a`.`asset_parent_serial_number` AS `asset_parent_serial_number`,`a`.`asset_parent_instance_number` AS `asset_parent_instance_number`,`p`.`product_id` AS `product_id`,`p`.`product_name` AS `product_name`,`p`.`product_manufacturer_id` AS `product_manufacturer_id`,`cm`.`company_name` AS `product_manufacturer_name`,`p`.`product_family` AS `product_family`,`p`.`product_group` AS `product_group`,`v`.`vendorasset_contract_num` AS `vendorasset_contract_num`,`v`.`vendorasset_customer_id` AS `vendorasset_customer_id`,`cv`.`company_name` AS `vendorasset_customer_name`,`n`.`nttasset_contract_number` AS `nttasset_contract_number`,`n`.`nttasset_customer_id` AS `nttasset_customer_id`,`cn`.`company_name` AS `nttasset_customer_name`,`v`.`vendorasset_vendor_id` AS `vendorasset_vendor_id`,`cc`.`company_name` AS `vendorasset_vendor_name`,`v`.`vendorasset_start` AS `vendorasset_start`,`v`.`vendorasset_end` AS `vendorasset_end`,`n`.`nttasset_contract_start` AS `nttasset_contract_start`,`n`.`nttasset_contract_end` AS `nttasset_contract_end`,case when `v`.`vendorasset_end` is null or `n`.`nttasset_contract_end` is null then NULL else to_days(`v`.`vendorasset_end`) - to_days(`n`.`nttasset_contract_end`) end AS `end_date_diff_days`,case when `v`.`vendorasset_start` is null or `n`.`nttasset_contract_start` is null then NULL else to_days(`v`.`vendorasset_start`) - to_days(`n`.`nttasset_contract_start`) end AS `start_date_diff_days`,case when `v`.`vendorasset_customer_id` is null or `n`.`nttasset_customer_id` is null then NULL when `v`.`vendorasset_customer_id` <> `n`.`nttasset_customer_id` then 1 else 0 end AS `customer_mismatch_flag`,case when `v`.`vendorasset_end` is null or `n`.`nttasset_contract_end` is null then 'ALERT' when `v`.`vendorasset_end` <> `n`.`nttasset_contract_end` then 'CRITICAL' when `v`.`vendorasset_customer_id` is null or `n`.`nttasset_customer_id` is null then 'ALERT' when `v`.`vendorasset_customer_id` <> `n`.`nttasset_customer_id` then 'ALERT' else 'OK' end AS `status_consolidated`,case when `v`.`vendorasset_end` is null and `n`.`nttasset_contract_end` is not null then 'MISSING_VENDOR' when `n`.`nttasset_contract_end` is null and `v`.`vendorasset_end` is not null then 'MISSING_NTT' when `v`.`vendorasset_end` is null and `n`.`nttasset_contract_end` is null then 'NO_CONTRACTS' when `v`.`vendorasset_end` <> `n`.`nttasset_contract_end` then 'END_DATE_MISMATCH' when `v`.`vendorasset_customer_id` is null or `n`.`nttasset_customer_id` is null then 'MISSING_CUSTOMER' when `v`.`vendorasset_customer_id` <> `n`.`nttasset_customer_id` then 'CUSTOMER_MISMATCH' else NULL end AS `alert_reason`,`p`.`product_endofsale` AS `product_eos`,`p`.`product_endofsupport` AS `product_ldos`,case when `p`.`product_endofsale` is null then 'no date information' when `p`.`product_endofsale` < curdate() then 'expired' when `p`.`product_endofsale` = curdate() then 'today' when yearweek(`p`.`product_endofsale`,1) = yearweek(curdate(),1) then 'this week' when `p`.`product_endofsale` <= curdate() + interval 30 day then '< 30 days' when `p`.`product_endofsale` <= curdate() + interval 90 day then '< 90 days' when `p`.`product_endofsale` <= curdate() + interval 180 day then '< 180 days' when `p`.`product_endofsale` <= curdate() + interval 1 year then '< 1 year' else '> 1 year' end AS `eos_status`,case when `p`.`product_endofsupport` is null then 'no date information' when `p`.`product_endofsupport` < curdate() then 'expired' when `p`.`product_endofsupport` = curdate() then 'today' when yearweek(`p`.`product_endofsupport`,1) = yearweek(curdate(),1) then 'this week' when `p`.`product_endofsupport` <= curdate() + interval 30 day then '< 30 days' when `p`.`product_endofsupport` <= curdate() + interval 90 day then '< 90 days' when `p`.`product_endofsupport` <= curdate() + interval 180 day then '< 180 days' when `p`.`product_endofsupport` <= curdate() + interval 1 year then '< 1 year' else '> 1 year' end AS `ldos_status` from (((((((`tbAsset` `a` left join `tbProduct` `p` on(`p`.`product_id` = `a`.`asset_product_id`)) left join `tbCompany` `cm` on(`p`.`product_manufacturer_id` = `cm`.`company_id`)) left join (select `t`.`vendorasset_asset_id` AS `asset_id`,`t`.`vendorasset_vendor_id` AS `vendorasset_vendor_id`,`t`.`vendorasset_contract_num` AS `vendorasset_contract_num`,`t`.`vendorasset_customer_id` AS `vendorasset_customer_id`,`t`.`vendorasset_start` AS `vendorasset_start`,`t`.`vendorasset_end` AS `vendorasset_end` from (`tbContractVendorAsset` `t` join (select `tbContractVendorAsset`.`vendorasset_asset_id` AS `asset_id`,max(`tbContractVendorAsset`.`vendorasset_end`) AS `max_end` from `tbContractVendorAsset` where `tbContractVendorAsset`.`vendorasset_end` is not null group by `tbContractVendorAsset`.`vendorasset_asset_id`) `m` on(`m`.`asset_id` = `t`.`vendorasset_asset_id` and `m`.`max_end` = `t`.`vendorasset_end`))) `v` on(`v`.`asset_id` = `a`.`asset_id`)) left join `tbCompany` `cv` on(`v`.`vendorasset_customer_id` = `cv`.`company_id`)) left join (select `t`.`nttasset_asset_id` AS `asset_id`,`t`.`nttasset_contract_number` AS `nttasset_contract_number`,`t`.`nttasset_customer_id` AS `nttasset_customer_id`,`t`.`nttasset_contract_start` AS `nttasset_contract_start`,`t`.`nttasset_contract_end` AS `nttasset_contract_end` from (`tbContractNTTAsset` `t` join (select `tbContractNTTAsset`.`nttasset_asset_id` AS `asset_id`,max(`tbContractNTTAsset`.`nttasset_contract_end`) AS `max_end` from `tbContractNTTAsset` where `tbContractNTTAsset`.`nttasset_contract_end` is not null group by `tbContractNTTAsset`.`nttasset_asset_id`) `m` on(`m`.`asset_id` = `t`.`nttasset_asset_id` and `m`.`max_end` = `t`.`nttasset_contract_end`))) `n` on(`n`.`asset_id` = `a`.`asset_id`)) left join `tbCompany` `cn` on(`n`.`nttasset_customer_id` = `cn`.`company_id`)) left join `tbCompany` `cc` on(`v`.`vendorasset_vendor_id` = `cc`.`company_id`)) where `v`.`vendorasset_end` is not null or `n`.`nttasset_contract_end` is not null */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAssetSnapshot`
--

/*!50001 DROP VIEW IF EXISTS `vwAssetSnapshot`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAssetSnapshot` AS select `a`.`asset_id` AS `asset_id`,coalesce(`p`.`product_part_number`,`p`.`product_name`) AS `product_part_number`,`p`.`product_id` AS `product_id`,`p`.`product_manufacturer_name` AS `product_manufacturer_name`,`p`.`product_endofsupport` AS `product_endofsupport`,`c`.`company_id` AS `company_id`,`c`.`company_name` AS `company_name`,`s`.`site_id` AS `site_id`,`s`.`site_name` AS `site_name`,`last_track`.`tracking_id` AS `last_tracking_id`,`last_track`.`tracking_operation` AS `last_tracking_operation`,`last_track`.`tracking_operation_date` AS `last_tracking_date`,`a`.`asset_serial_number` AS `asset_serial_number`,`a`.`asset_instance_number` AS `asset_instance_number`,`a`.`asset_price` AS `unit_value`,case when `last_track`.`tracking_operation_date` is null then NULL else to_days(curdate()) - to_days(`last_track`.`tracking_operation_date`) end AS `days_since_last_op`,case when `last_track`.`tracking_operation` = 'DELIVERED' and to_days(curdate()) - to_days(`last_track`.`tracking_operation_date`) > 90 then 1 else 0 end AS `is_idle_90d`,`ntt`.`nttasset_contract_number` AS `nttasset_contract_number`,coalesce(`ntt`.`nttasset_price`,`v`.`vendorasset_product_price`,`a`.`asset_price`) AS `reference_price`,`lead`.`avg_lead_days` AS `avg_lead_days`,concat(`p`.`product_id`,'::',coalesce(`s`.`site_id`,0)) AS `snapshot_key`,`dep`.`deployment_id` AS `deployment_id`,`dep`.`deployment_status` AS `deployment_status`,`dep`.`environment` AS `deployment_environment`,`dep`.`hostname` AS `deployment_hostname`,`dep`.`mgmt_ip` AS `deployment_mgmt_ip`,`dep`.`vip_ip` AS `deployment_vip_ip`,`dep`.`is_shared_mgmt_ip` AS `deployment_is_shared_mgmt_ip`,`dep`.`is_shared_vip_ip` AS `deployment_is_shared_vip_ip`,`dep`.`deployment_group_type` AS `deployment_group_type`,`dep`.`deployment_group_key` AS `deployment_group_key`,`dep`.`deployment_role` AS `deployment_role`,`dep`.`parent_asset_id` AS `deployment_parent_asset_id`,`dep`.`member_index` AS `deployment_member_index`,`dep`.`slot` AS `deployment_slot`,`dep`.`port` AS `deployment_port`,`dep`.`installed_at` AS `deployment_installed_at`,`dep`.`in_production_at` AS `deployment_in_production_at`,`dep`.`retired_at` AS `deployment_retired_at` from ((((((((`tbAsset` `a` left join `tbProduct` `p` on(`p`.`product_id` = `a`.`asset_product_id`)) left join (select `t1`.`tracking_asset_id` AS `tracking_asset_id`,`t1`.`tracking_id` AS `tracking_id`,`t1`.`tracking_site_id` AS `tracking_site_id`,`t1`.`tracking_operation` AS `tracking_operation`,`t1`.`tracking_operation_date` AS `tracking_operation_date` from (select `at`.`tracking_asset_id` AS `tracking_asset_id`,`at`.`tracking_id` AS `tracking_id`,`at`.`tracking_site_id` AS `tracking_site_id`,`at`.`tracking_operation` AS `tracking_operation`,`at`.`tracking_operation_date` AS `tracking_operation_date`,row_number() over ( partition by `at`.`tracking_asset_id` order by `at`.`tracking_id` desc) AS `rn` from `tbAssetTracking` `at`) `t1` where `t1`.`rn` = 1) `last_track` on(`last_track`.`tracking_asset_id` = `a`.`asset_id`)) left join `tbCompanySite` `s` on(`s`.`site_id` = `last_track`.`tracking_site_id`)) left join `tbCompany` `c` on(`c`.`company_id` = `s`.`site_company_id`)) left join `tbContractNTTAsset` `ntt` on(`ntt`.`nttasset_asset_id` = `a`.`asset_id`)) left join `tbContractVendorAsset` `v` on(`v`.`vendorasset_asset_id` = `a`.`asset_id`)) left join (select `pu`.`purchase_product_id` AS `product_id`,round(avg(to_days(`pu`.`purchase_date_booked`) - to_days(`pu`.`purchase_date_ordered`)),2) AS `avg_lead_days`,count(0) AS `samples` from `tbPurchase` `pu` where `pu`.`purchase_date_ordered` is not null and `pu`.`purchase_date_booked` is not null group by `pu`.`purchase_product_id`) `lead` on(`lead`.`product_id` = `p`.`product_id`)) left join (select `x`.`deployment_id` AS `deployment_id`,`x`.`deployment_company_id` AS `deployment_company_id`,`x`.`deployment_site_id` AS `deployment_site_id`,`x`.`deployment_asset_id` AS `deployment_asset_id`,`x`.`environment` AS `environment`,`x`.`hostname` AS `hostname`,`x`.`mgmt_ip` AS `mgmt_ip`,`x`.`vip_ip` AS `vip_ip`,`x`.`is_shared_mgmt_ip` AS `is_shared_mgmt_ip`,`x`.`is_shared_vip_ip` AS `is_shared_vip_ip`,`x`.`deployment_group_type` AS `deployment_group_type`,`x`.`deployment_group_key` AS `deployment_group_key`,`x`.`deployment_role` AS `deployment_role`,`x`.`parent_asset_id` AS `parent_asset_id`,`x`.`member_index` AS `member_index`,`x`.`slot` AS `slot`,`x`.`port` AS `port`,`x`.`deployment_status` AS `deployment_status`,`x`.`installed_at` AS `installed_at`,`x`.`in_production_at` AS `in_production_at`,`x`.`retired_at` AS `retired_at`,`x`.`remark` AS `remark`,`x`.`is_active` AS `is_active`,`x`.`created_at` AS `created_at`,`x`.`updated_at` AS `updated_at`,`x`.`rn` AS `rn` from (select `d`.`deployment_id` AS `deployment_id`,`d`.`deployment_company_id` AS `deployment_company_id`,`d`.`deployment_site_id` AS `deployment_site_id`,`d`.`deployment_asset_id` AS `deployment_asset_id`,`d`.`environment` AS `environment`,`d`.`hostname` AS `hostname`,`d`.`mgmt_ip` AS `mgmt_ip`,`d`.`vip_ip` AS `vip_ip`,`d`.`is_shared_mgmt_ip` AS `is_shared_mgmt_ip`,`d`.`is_shared_vip_ip` AS `is_shared_vip_ip`,`d`.`deployment_group_type` AS `deployment_group_type`,`d`.`deployment_group_key` AS `deployment_group_key`,`d`.`deployment_role` AS `deployment_role`,`d`.`parent_asset_id` AS `parent_asset_id`,`d`.`member_index` AS `member_index`,`d`.`slot` AS `slot`,`d`.`port` AS `port`,`d`.`deployment_status` AS `deployment_status`,`d`.`installed_at` AS `installed_at`,`d`.`in_production_at` AS `in_production_at`,`d`.`retired_at` AS `retired_at`,`d`.`remark` AS `remark`,`d`.`is_active` AS `is_active`,`d`.`created_at` AS `created_at`,`d`.`updated_at` AS `updated_at`,row_number() over ( partition by `d`.`deployment_asset_id` order by `d`.`is_active` desc,`d`.`updated_at` desc,`d`.`deployment_id` desc) AS `rn` from `tbAssetDeployment` `d` where `d`.`is_active` = 1 and `d`.`deployment_status` in ('INSTALLED','IN_PRODUCTION','MAINTENANCE')) `x` where `x`.`rn` = 1) `dep` on(`dep`.`deployment_asset_id` = `a`.`asset_id` and `dep`.`deployment_company_id` = `c`.`company_id` and `dep`.`deployment_site_id` = `s`.`site_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwAssetTracking`
--

/*!50001 DROP VIEW IF EXISTS `vwAssetTracking`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwAssetTracking` AS select `tat`.`tracking_id` AS `tracking_id`,`tat`.`tracking_company_id` AS `tracking_company_id`,`tc`.`company_name` AS `tracking_company_name`,`tat`.`tracking_site_id` AS `tracking_site_id`,`tcs`.`site_name` AS `tracking_site_name`,`tat`.`tracking_asset_id` AS `tracking_asset_id`,`tp`.`product_id` AS `tracking_product_id`,`tp`.`product_part_number` AS `tracking_product_part_number`,`tat`.`tracking_ov` AS `tracking_ov`,`tat`.`tracking_nf` AS `tracking_nf`,`ti`.`asset_serial_number` AS `tracking_asset_serial_number`,`ti`.`asset_instance_number` AS `tracking_asset_instance_number`,`tat`.`tracking_operation` AS `tracking_operation`,`tat`.`tracking_operation_by` AS `tracking_operation_by`,`tat`.`tracking_operation_date` AS `tracking_operation_date`,`tat`.`tracking_remark` AS `tracking_remark` from ((((`tbAssetTracking` `tat` join `tbCompanySite` `tcs` on(`tat`.`tracking_site_id` = `tcs`.`site_id`)) join `tbCompany` `tc` on(`tcs`.`site_company_id` = `tc`.`company_id`)) join `tbAsset` `ti` on(`ti`.`asset_id` = `tat`.`tracking_asset_id`)) join `tbProduct` `tp` on(`tp`.`product_id` = `ti`.`asset_product_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoEAConsumptionSummary`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoEAConsumptionSummary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoEAConsumptionSummary` AS select `m`.`mcea_client_id` AS `mcea_client_id`,`m`.`mcea_domain` AS `mcea_domain`,`m`.`mcea_virtual_account` AS `mcea_virtual_account`,`m`.`mcea_sku` AS `mcea_sku`,`m`.`mcea_purchased` AS `mcea_purchased`,`m`.`mcea_growth_allowance` AS `mcea_growth_allowance`,`m`.`mcea_total_purchased` AS `mcea_total_purchased`,`m`.`mcea_generated` AS `mcea_generated`,round(`m`.`mcea_generated` / nullif(coalesce(`m`.`mcea_purchased`,1),0),4) AS `mcea_percentage_generated_purchased`,round(`m`.`mcea_generated` / nullif(coalesce(`m`.`mcea_total_purchased`,1),0),4) AS `mcea_percentage_generated_total_purchased`,`s`.`mcea_purchased_sum` AS `mcea_purchased_sum`,`s`.`mcea_growth_allowance_sum` AS `mcea_growth_allowance_sum`,`s`.`mcea_total_purchased_sum` AS `mcea_total_purchased_sum`,`s`.`mcea_generated_sum` AS `mcea_generated_sum`,round(`m`.`mcea_purchased` / nullif(coalesce(`s`.`mcea_purchased_sum`,1),0),6) AS `mcea_percentage_puchased_puchased_sum`,round(`m`.`mcea_purchased` / nullif(coalesce(`s`.`mcea_total_purchased_sum`,1),0),6) AS `mcea_percentage_puchased_total_puchased_sum`,round(`m`.`mcea_generated` / nullif(coalesce(`s`.`mcea_generated_sum`,1),0),6) AS `mcea_percentage_generated_generated_sum`,round(`m`.`mcea_generated` / nullif(coalesce(`s`.`mcea_total_purchased_sum`,1),0),6) AS `mcea_percentage_generated_total_purchased_sum` from ((select `x`.`mcea_client_id` AS `mcea_client_id`,`x`.`mcea_domain` AS `mcea_domain`,`x`.`mcea_virtual_account` AS `mcea_virtual_account`,`x`.`mcea_sku` AS `mcea_sku`,`x`.`mcea_purchased` AS `mcea_purchased`,`x`.`mcea_growth_allowance` AS `mcea_growth_allowance`,`x`.`mcea_total_purchased` AS `mcea_total_purchased`,`x`.`mcea_generated` AS `mcea_generated`,`x`.`mcea_balance` AS `mcea_balance`,`x`.`mcea_pre_ea` AS `mcea_pre_ea`,`x`.`mcea_license_migrated` AS `mcea_license_migrated`,`x`.`mcea_update` AS `mcea_update`,`x`.`mcea_overconsume` AS `mcea_overconsume` from (select `t`.`mcea_id` AS `mcea_id`,`t`.`mcea_client_id` AS `mcea_client_id`,`t`.`mcea_client` AS `mcea_client`,`t`.`mcea_domain` AS `mcea_domain`,`t`.`mcea_virtual_account` AS `mcea_virtual_account`,`t`.`mcea_subscription` AS `mcea_subscription`,`t`.`mcea_ntf_date` AS `mcea_ntf_date`,`t`.`mcea_status` AS `mcea_status`,`t`.`mcea_start_date` AS `mcea_start_date`,`t`.`mcea_end_date` AS `mcea_end_date`,`t`.`mcea_suite_name` AS `mcea_suite_name`,`t`.`mcea_calculation_method` AS `mcea_calculation_method`,`t`.`mcea_product_id` AS `mcea_product_id`,`t`.`mcea_sku` AS `mcea_sku`,`t`.`mcea_purchased` AS `mcea_purchased`,`t`.`mcea_growth_allowance` AS `mcea_growth_allowance`,`t`.`mcea_total_purchased` AS `mcea_total_purchased`,`t`.`mcea_generated` AS `mcea_generated`,`t`.`mcea_balance` AS `mcea_balance`,`t`.`mcea_pre_ea` AS `mcea_pre_ea`,`t`.`mcea_license_migrated` AS `mcea_license_migrated`,`t`.`mcea_update` AS `mcea_update`,`t`.`mcea_track` AS `mcea_track`,case when `t`.`mcea_balance` < 0 then -`t`.`mcea_balance` else 0 end AS `mcea_overconsume`,row_number() over ( partition by `t`.`mcea_client_id`,`t`.`mcea_domain`,`t`.`mcea_virtual_account`,`t`.`mcea_subscription`,`t`.`mcea_start_date`,`t`.`mcea_end_date`,`t`.`mcea_suite_name`,`t`.`mcea_sku` order by `t`.`mcea_update` desc,`t`.`mcea_id` desc) AS `rn` from `tbCiscoEnterpriseAgreementMetering` `t`) `x` where `x`.`rn` = 1) `m` join (select `z`.`mcea_client_id` AS `mcea_client_id`,sum(`z`.`mcea_purchased`) AS `mcea_purchased_sum`,sum(`z`.`mcea_growth_allowance`) AS `mcea_growth_allowance_sum`,sum(`z`.`mcea_total_purchased`) AS `mcea_total_purchased_sum`,sum(`z`.`mcea_generated`) AS `mcea_generated_sum`,sum(`z`.`mcea_pre_ea`) AS `mcea_pre_ea_sum`,sum(`z`.`mcea_license_migrated`) AS `mcea_license_migrated_sum`,sum(`z`.`mcea_overconsume`) AS `mcea_overconsume_sum` from (select `y`.`mcea_client_id` AS `mcea_client_id`,`y`.`mcea_purchased` AS `mcea_purchased`,`y`.`mcea_growth_allowance` AS `mcea_growth_allowance`,`y`.`mcea_total_purchased` AS `mcea_total_purchased`,`y`.`mcea_generated` AS `mcea_generated`,`y`.`mcea_pre_ea` AS `mcea_pre_ea`,`y`.`mcea_license_migrated` AS `mcea_license_migrated`,case when `y`.`mcea_balance` < 0 then -`y`.`mcea_balance` else 0 end AS `mcea_overconsume` from (select `t`.`mcea_id` AS `mcea_id`,`t`.`mcea_client_id` AS `mcea_client_id`,`t`.`mcea_client` AS `mcea_client`,`t`.`mcea_domain` AS `mcea_domain`,`t`.`mcea_virtual_account` AS `mcea_virtual_account`,`t`.`mcea_subscription` AS `mcea_subscription`,`t`.`mcea_ntf_date` AS `mcea_ntf_date`,`t`.`mcea_status` AS `mcea_status`,`t`.`mcea_start_date` AS `mcea_start_date`,`t`.`mcea_end_date` AS `mcea_end_date`,`t`.`mcea_suite_name` AS `mcea_suite_name`,`t`.`mcea_calculation_method` AS `mcea_calculation_method`,`t`.`mcea_product_id` AS `mcea_product_id`,`t`.`mcea_sku` AS `mcea_sku`,`t`.`mcea_purchased` AS `mcea_purchased`,`t`.`mcea_growth_allowance` AS `mcea_growth_allowance`,`t`.`mcea_total_purchased` AS `mcea_total_purchased`,`t`.`mcea_generated` AS `mcea_generated`,`t`.`mcea_balance` AS `mcea_balance`,`t`.`mcea_pre_ea` AS `mcea_pre_ea`,`t`.`mcea_license_migrated` AS `mcea_license_migrated`,`t`.`mcea_update` AS `mcea_update`,`t`.`mcea_track` AS `mcea_track`,row_number() over ( partition by `t`.`mcea_client_id`,`t`.`mcea_domain`,`t`.`mcea_virtual_account`,`t`.`mcea_subscription`,`t`.`mcea_start_date`,`t`.`mcea_end_date`,`t`.`mcea_suite_name`,`t`.`mcea_sku` order by `t`.`mcea_update` desc,`t`.`mcea_id` desc) AS `rn` from `tbCiscoEnterpriseAgreementMetering` `t`) `y` where `y`.`rn` = 1) `z` group by `z`.`mcea_client_id`) `s` on(`s`.`mcea_client_id` = `m`.`mcea_client_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoEACustomerWebOrder`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoEACustomerWebOrder`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoEACustomerWebOrder` AS select `tbCiscoEA`.`ea_web_order_id` AS `ea_web_order_id`,`tbCiscoEA`.`ea_end_customer_id` AS `ea_end_customer_id` from `tbCiscoEA` where `tbCiscoEA`.`ea_end_customer_id` <> 0 and `tbCiscoEA`.`ea_web_order_id` is not null group by `tbCiscoEA`.`ea_web_order_id`,`tbCiscoEA`.`ea_end_customer_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoEAEndDateNearlyExpire`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoEAEndDateNearlyExpire`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoEAEndDateNearlyExpire` AS select `ea`.`ea_id` AS `ea_id`,`ea`.`ea_end_customer_id` AS `ea_end_customer`,`ea`.`ea_product_id` AS `ea_product_id`,`ea`.`ea_end_date` AS `ea_end_date`,`ea`.`ea_subscription_id` AS `ea_subscription_id`,`ea`.`ea_end_date_task_id` AS `ea_end_date_task_id`,coalesce(`at`.`csm_id`,0) AS `ea_csm_id` from (`tbCiscoEA` `ea` left join (select `tbAccountTeam`.`accountteam_company_id` AS `client_id`,min(`tbAccountTeam`.`accountteam_user_id`) AS `csm_id` from `tbAccountTeam` where `tbAccountTeam`.`accountteam_user_type` = 'CSM' and `tbAccountTeam`.`accountteam_allocated` <> 0 group by `tbAccountTeam`.`accountteam_company_id`) `at` on(`ea`.`ea_end_customer_id` = `at`.`client_id`)) where `ea`.`ea_product_id` = 4716 and `ea`.`ea_end_date` >= curdate() and `ea`.`ea_end_date` <= curdate() + interval 90 day and `ea`.`ea_end_date_task_id` = 0 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoEAMeteringHistory`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoEAMeteringHistory`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoEAMeteringHistory` AS select `m`.`mcea_id` AS `mcea_id`,`m`.`mcea_client_id` AS `mcea_client_id`,`m`.`mcea_client` AS `mcea_client`,`m`.`mcea_domain` AS `mcea_domain`,`m`.`mcea_virtual_account` AS `mcea_virtual_account`,`m`.`mcea_subscription` AS `mcea_subscription`,`m`.`mcea_ntf_date` AS `mcea_ntf_date`,`m`.`mcea_status` AS `mcea_status`,`m`.`mcea_start_date` AS `mcea_start_date`,`m`.`mcea_end_date` AS `mcea_end_date`,`m`.`mcea_suite_name` AS `mcea_suite_name`,`m`.`mcea_calculation_method` AS `mcea_calculation_method`,`m`.`mcea_product_id` AS `mcea_product_id`,`m`.`mcea_sku` AS `mcea_sku`,`m`.`mcea_purchased` AS `mcea_purchased`,`m`.`mcea_growth_allowance` AS `mcea_growth_allowance`,`m`.`mcea_total_purchased` AS `mcea_total_purchased`,`m`.`mcea_generated` AS `mcea_generated`,`m`.`mcea_balance` AS `mcea_balance`,`m`.`mcea_pre_ea` AS `mcea_pre_ea`,`m`.`mcea_license_migrated` AS `mcea_license_migrated`,`m`.`mcea_update` AS `mcea_update`,`m`.`mcea_track` AS `mcea_track`,`c`.`company_name` AS `mcea_client_name` from (`tbCiscoEnterpriseAgreementMetering` `m` join `tbCompany` `c` on(`m`.`mcea_client_id` = `c`.`company_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoEAMeteringLatest`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoEAMeteringLatest`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoEAMeteringLatest` AS select `x`.`mcea_id` AS `mcea_id`,`x`.`mcea_client_id` AS `mcea_client_id`,`x`.`mcea_client` AS `mcea_client`,`x`.`mcea_domain` AS `mcea_domain`,`x`.`mcea_virtual_account` AS `mcea_virtual_account`,`x`.`mcea_subscription` AS `mcea_subscription`,`x`.`mcea_ntf_date` AS `mcea_ntf_date`,`x`.`mcea_status` AS `mcea_status`,`x`.`mcea_start_date` AS `mcea_start_date`,`x`.`mcea_end_date` AS `mcea_end_date`,`x`.`mcea_suite_name` AS `mcea_suite_name`,`x`.`mcea_calculation_method` AS `mcea_calculation_method`,`x`.`mcea_product_id` AS `mcea_product_id`,`x`.`mcea_sku` AS `mcea_sku`,`x`.`mcea_purchased` AS `mcea_purchased`,`x`.`mcea_growth_allowance` AS `mcea_growth_allowance`,`x`.`mcea_total_purchased` AS `mcea_total_purchased`,`x`.`mcea_generated` AS `mcea_generated`,`x`.`mcea_balance` AS `mcea_balance`,`x`.`mcea_pre_ea` AS `mcea_pre_ea`,`x`.`mcea_license_migrated` AS `mcea_license_migrated`,case when `x`.`mcea_balance` < 0 then -`x`.`mcea_balance` else 0 end AS `mcea_overconsume`,`x`.`mcea_update` AS `mcea_update` from (select `t`.`mcea_id` AS `mcea_id`,`t`.`mcea_client_id` AS `mcea_client_id`,`t`.`mcea_client` AS `mcea_client`,`t`.`mcea_domain` AS `mcea_domain`,`t`.`mcea_virtual_account` AS `mcea_virtual_account`,`t`.`mcea_subscription` AS `mcea_subscription`,`t`.`mcea_ntf_date` AS `mcea_ntf_date`,`t`.`mcea_status` AS `mcea_status`,`t`.`mcea_start_date` AS `mcea_start_date`,`t`.`mcea_end_date` AS `mcea_end_date`,`t`.`mcea_suite_name` AS `mcea_suite_name`,`t`.`mcea_calculation_method` AS `mcea_calculation_method`,`t`.`mcea_product_id` AS `mcea_product_id`,`t`.`mcea_sku` AS `mcea_sku`,`t`.`mcea_purchased` AS `mcea_purchased`,`t`.`mcea_growth_allowance` AS `mcea_growth_allowance`,`t`.`mcea_total_purchased` AS `mcea_total_purchased`,`t`.`mcea_generated` AS `mcea_generated`,`t`.`mcea_balance` AS `mcea_balance`,`t`.`mcea_pre_ea` AS `mcea_pre_ea`,`t`.`mcea_license_migrated` AS `mcea_license_migrated`,`t`.`mcea_update` AS `mcea_update`,`t`.`mcea_track` AS `mcea_track`,row_number() over ( partition by `t`.`mcea_client_id`,`t`.`mcea_domain`,`t`.`mcea_virtual_account`,`t`.`mcea_subscription`,`t`.`mcea_start_date`,`t`.`mcea_end_date`,`t`.`mcea_suite_name`,`t`.`mcea_sku` order by `t`.`mcea_update` desc,`t`.`mcea_id` desc) AS `rn` from `tbCiscoEnterpriseAgreementMetering` `t`) `x` where `x`.`rn` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoLCI`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoLCI`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoLCI` AS select `c`.`company_name` AS `lci_client_name`,`y`.`tasktype_name` AS `lci_type`,`t`.`task_status` AS `lci_status`,`t`.`task_track` AS `lci_track`,`t`.`task_subtrack` AS `lci_use_case`,`t`.`task_ws` AS `lci_ws`,`t`.`task_deal_id` AS `lci_deal_id`,`t`.`task_eligible` AS `task_eligible`,`u`.`user_name` AS `lci_csm_name`,`a`.`activity_name` AS `lci_stage_name`,`a`.`activity_ws` AS `lci_stage_ws`,coalesce(`a`.`activity_start`,`a`.`activity_start_performed`) AS `lci_stage_start`,coalesce(`a`.`activity_end`,`a`.`activity_end_performed`) AS `lci_stage_end`,case when coalesce(`a`.`activity_end`,`a`.`activity_end_performed`) is null then NULL when month(coalesce(`a`.`activity_end`,`a`.`activity_end_performed`)) >= 4 then year(coalesce(`a`.`activity_end`,`a`.`activity_end_performed`)) else year(coalesce(`a`.`activity_end`,`a`.`activity_end_performed`)) - 1 end AS `lci_stage_end_fy`,`a`.`activity_value` AS `lci_stage_value`,`a`.`activity_approved_value` AS `lci_stage_approval_value`,`a`.`activity_approval_date` AS `lci_stage_approval_date`,`a`.`activity_approval_fy` AS `lci_stage_approval_fy`,`a`.`activity_backlog_value` AS `lci_stage_backlog_value`,`a`.`activity_status` AS `lci_stage_status_id`,`s`.`statustype_name` AS `lci_stage_status_name` from (((((`tbTask` `t` join `tbTaskActivity` `a` on(`t`.`task_id` = `a`.`activity_task_id`)) join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbUser` `u` on(`t`.`task_owner_id` = `u`.`user_id`)) join `tbTaskType` `y` on(`t`.`task_tasktype_id` = `y`.`tasktype_id`)) join `tbStatusType` `s` on(`a`.`activity_status` = `s`.`statustype_id`)) where `t`.`task_tasktype_id` in (21,22) and `a`.`activity_ws` is not null and `a`.`activity_value` is not null */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoLCIjourney`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoLCIjourney`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoLCIjourney` AS select `t`.`task_id` AS `task_id`,`t`.`task_tasktype_id` AS `task_type_id`,`tp`.`tasktype_name` AS `task_type_name`,`t`.`task_customer_id` AS `task_client_id`,`c`.`company_name` AS `task_client_name`,`t`.`task_owner_id` AS `task_csm_id`,case when `t`.`task_owner_id` is null then 'NO CSM' else `u`.`user_name` end AS `task_csm_name`,`t`.`task_track` AS `task_track`,`t`.`task_subtrack` AS `task_use_case`,`t`.`task_ws` AS `task_ws`,`t`.`task_deal_id` AS `task_did`,`t`.`task_start` AS `task_start_date`,`t`.`task_end` AS `task_end_date`,`t`.`task_status` AS `task_status_id`,case when `t`.`task_status` = 1 then 'NOT OPTED IN YET' else `s`.`statustype_name` end AS `task_status_name`,`t`.`task_currency` AS `task_currency`,`t`.`task_value` AS `task_value`,`t`.`task_forecast` AS `task_forecast`,`t`.`task_backlog` AS `task_backlog`,case when `tonb`.`activity_status` is null then 'NOT AVAILABLE' when `t`.`task_status` = 1 and `tonb`.`activity_status` = 1 then 'NOT OPTED IN YET' else `sonb`.`statustype_name` end AS `onboard_status`,case when `tuse`.`activity_status` is null then 'NOT AVAILABLE' when `t`.`task_status` = 1 and `tuse`.`activity_status` = 1 then 'NOT OPTED IN YET' else `suse`.`statustype_name` end AS `use_status`,case when `teng`.`activity_status` is null then 'NOT AVAILABLE' when `t`.`task_status` = 1 and `teng`.`activity_status` = 1 then 'NOT OPTED IN YET' else `seng`.`statustype_name` end AS `engage_status`,case when `tado`.`activity_status` is null then 'NOT AVAILABLE' when `t`.`task_status` = 1 and `tado`.`activity_status` = 1 then 'NOT OPTED IN YET' else `sado`.`statustype_name` end AS `adopt_status`,case when `timp`.`activity_status` is null then 'NOT AVAILABLE' when `t`.`task_status` = 1 and `timp`.`activity_status` = 1 then 'NOT OPTED IN YET' else `simp`.`statustype_name` end AS `implement_status`,case when `topt`.`activity_status` is null then 'NOT AVAILABLE' when `t`.`task_status` = 1 and `topt`.`activity_status` = 1 then 'NOT OPTED IN YET' else `sopt`.`statustype_name` end AS `optimize_status`,case when `tonb`.`activity_status` is null then 0 else `tonb`.`activity_value` end AS `onboard_value`,case when `tuse`.`activity_status` is null then 0 else `tuse`.`activity_value` end AS `use_value`,case when `teng`.`activity_status` is null then 0 else `teng`.`activity_value` end AS `engage_value`,case when `tado`.`activity_status` is null then 0 else `tado`.`activity_value` end AS `adopt_value`,case when `timp`.`activity_status` is null then 0 else `timp`.`activity_value` end AS `implement_value`,case when `t`.`task_status` in (4,5,6) or `tonb`.`activity_status` is null then 0 else `tonb`.`activity_approved_value` end AS `onboard_approved_value`,case when `t`.`task_status` in (4,5,6) or `tuse`.`activity_status` is null then 0 else `tuse`.`activity_approved_value` end AS `use_approved_value`,case when `t`.`task_status` in (4,5,6) or `teng`.`activity_status` is null then 0 else `teng`.`activity_approved_value` end AS `engage_approved_value`,case when `t`.`task_status` in (4,5,6) or `tado`.`activity_status` is null then 0 else `tado`.`activity_approved_value` end AS `adopt_approved_value`,case when `t`.`task_status` in (4,5,6) or `timp`.`activity_status` is null then 0 else `timp`.`activity_approved_value` end AS `implement_approved_value` from ((((((((((((((((`tbTask` `t` join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) join `tbStatusType` `s` on(`t`.`task_status` = `s`.`statustype_id`)) left join `tbUser` `u` on(`t`.`task_owner_id` = `u`.`user_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbTaskActivity` `tonb` on(`t`.`task_id` = `tonb`.`activity_task_id` and `tonb`.`activity_name` = 'Onboard')) left join `tbStatusType` `sonb` on(`tonb`.`activity_status` = `sonb`.`statustype_id`)) left join `tbTaskActivity` `tuse` on(`t`.`task_id` = `tuse`.`activity_task_id` and `tuse`.`activity_name` = 'Use')) left join `tbStatusType` `suse` on(`tuse`.`activity_status` = `suse`.`statustype_id`)) left join `tbTaskActivity` `teng` on(`t`.`task_id` = `teng`.`activity_task_id` and `teng`.`activity_name` = 'Engage')) left join `tbStatusType` `seng` on(`teng`.`activity_status` = `seng`.`statustype_id`)) left join `tbTaskActivity` `tado` on(`t`.`task_id` = `tado`.`activity_task_id` and `tado`.`activity_name` = 'Adopt')) left join `tbStatusType` `sado` on(`tado`.`activity_status` = `sado`.`statustype_id`)) left join `tbTaskActivity` `timp` on(`t`.`task_id` = `timp`.`activity_task_id` and `timp`.`activity_name` = 'Implement')) left join `tbStatusType` `simp` on(`timp`.`activity_status` = `simp`.`statustype_id`)) left join `tbTaskActivity` `topt` on(`t`.`task_id` = `topt`.`activity_task_id` and `topt`.`activity_name` = 'Optimize')) left join `tbStatusType` `sopt` on(`topt`.`activity_status` = `sopt`.`statustype_id`)) where `t`.`task_tasktype_id` = 22 and `t`.`task_eligible` = 'Y' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoSAConsumptionSummary`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoSAConsumptionSummary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoSAConsumptionSummary` AS select `base`.`mcsa_client_id` AS `mcsa_client_id`,`base`.`mcsa_domain` AS `mcsa_domain`,`base`.`mcsa_virtual_account` AS `mcsa_virtual_account`,`base`.`mcsa_available_to_use_sum` AS `mcsa_available_to_use_sum`,`base`.`mcsa_in_use_sum` AS `mcsa_in_use_sum`,round(case when coalesce(`base`.`mcsa_available_to_use_sum`,0) = 0 then 0 else `base`.`mcsa_in_use_sum` / nullif(`base`.`mcsa_available_to_use_sum`,0) end,6) AS `mcsa_percentage_in_use_sum_available_to_use_sum`,`base`.`mcsa_total_sum` AS `mcsa_total_sum`,round(case when coalesce(`base`.`mcsa_total_sum`,0) = 0 then 0 else `base`.`mcsa_in_use_sum` / nullif(`base`.`mcsa_total_sum`,0) end,6) AS `mcsa_percentage_in_use_sum_total_sum`,sum(round(case when coalesce(`base`.`mcsa_total_sum`,0) = 0 then 0 else `base`.`mcsa_in_use_sum` / nullif(`base`.`mcsa_total_sum`,0) end,6)) over ( partition by `base`.`mcsa_client_id`) AS `mcsa_percentage_in_use_sum_total_sum_by_client` from (select `snap`.`mcsa_client_id` AS `mcsa_client_id`,`snap`.`mcsa_domain` AS `mcsa_domain`,`snap`.`mcsa_virtual_account` AS `mcsa_virtual_account`,sum(`snap`.`mcsa_available_to_use`) AS `mcsa_available_to_use_sum`,sum(`snap`.`mcsa_in_use`) AS `mcsa_in_use_sum`,sum(sum(`snap`.`mcsa_available_to_use`)) over ( partition by `snap`.`mcsa_client_id`,`snap`.`mcsa_domain`) AS `mcsa_total_sum` from (select `x`.`mcsa_client_id` AS `mcsa_client_id`,`x`.`mcsa_domain` AS `mcsa_domain`,`x`.`mcsa_virtual_account` AS `mcsa_virtual_account`,`x`.`mcsa_available_to_use` AS `mcsa_available_to_use`,`x`.`mcsa_in_use` AS `mcsa_in_use` from (select `t`.`mcsa_id` AS `mcsa_id`,`t`.`mcsa_row_type` AS `mcsa_row_type`,`t`.`mcsa_client_id` AS `mcsa_client_id`,`t`.`mcsa_client` AS `mcsa_client`,`t`.`mcsa_domain` AS `mcsa_domain`,`t`.`mcsa_product_id` AS `mcsa_product_id`,`t`.`mcsa_license` AS `mcsa_license`,`t`.`mcsa_virtual_account` AS `mcsa_virtual_account`,`t`.`mcsa_billing` AS `mcsa_billing`,`t`.`mcsa_available_to_use` AS `mcsa_available_to_use`,`t`.`mcsa_in_use` AS `mcsa_in_use`,`t`.`mcsa_balance` AS `mcsa_balance`,`t`.`mcsa_compliance` AS `mcsa_compliance`,`t`.`mcsa_license_type` AS `mcsa_license_type`,`t`.`mcsa_quantity` AS `mcsa_quantity`,`t`.`mcsa_subscription` AS `mcsa_subscription`,`t`.`mcsa_days_to_end` AS `mcsa_days_to_end`,`t`.`mcsa_active` AS `mcsa_active`,`t`.`mcsa_start_date` AS `mcsa_start_date`,`t`.`mcsa_end_date` AS `mcsa_end_date`,`t`.`mcsa_update` AS `mcsa_update`,`t`.`mcsa_track` AS `mcsa_track`,row_number() over ( partition by `t`.`mcsa_client_id`,`t`.`mcsa_domain`,`t`.`mcsa_license`,`t`.`mcsa_virtual_account`,`t`.`mcsa_subscription` order by `t`.`mcsa_update` desc,`t`.`mcsa_id` desc) AS `rn` from `tbCiscoSmartAccountMetering` `t` where `t`.`mcsa_row_type` = 'metering') `x` where `x`.`rn` = 1) `snap` group by `snap`.`mcsa_client_id`,`snap`.`mcsa_domain`,`snap`.`mcsa_virtual_account`) `base` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoSAMeteringHistory`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoSAMeteringHistory`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoSAMeteringHistory` AS select `sa`.`mcsa_id` AS `mcsa_id`,`sa`.`mcsa_row_type` AS `mcsa_row_type`,`sa`.`mcsa_client_id` AS `mcsa_client_id`,`sa`.`mcsa_client` AS `mcsa_client`,`sa`.`mcsa_domain` AS `mcsa_domain`,`sa`.`mcsa_product_id` AS `mcsa_product_id`,`sa`.`mcsa_license` AS `mcsa_license`,`sa`.`mcsa_virtual_account` AS `mcsa_virtual_account`,`sa`.`mcsa_billing` AS `mcsa_billing`,`sa`.`mcsa_available_to_use` AS `mcsa_available_to_use`,`sa`.`mcsa_in_use` AS `mcsa_in_use`,`sa`.`mcsa_balance` AS `mcsa_balance`,`sa`.`mcsa_compliance` AS `mcsa_compliance`,`sa`.`mcsa_license_type` AS `mcsa_license_type`,`sa`.`mcsa_quantity` AS `mcsa_quantity`,`sa`.`mcsa_subscription` AS `mcsa_subscription`,`sa`.`mcsa_days_to_end` AS `mcsa_days_to_end`,`sa`.`mcsa_active` AS `mcsa_active`,`sa`.`mcsa_start_date` AS `mcsa_start_date`,`sa`.`mcsa_end_date` AS `mcsa_end_date`,`sa`.`mcsa_update` AS `mcsa_update`,`sa`.`mcsa_track` AS `mcsa_track`,`c`.`company_name` AS `mcsa_client_name` from (`tbCiscoSmartAccountMetering` `sa` join `tbCompany` `c` on(`c`.`company_id` = `sa`.`mcsa_client_id`)) where `sa`.`mcsa_row_type` = 'metering' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoSAMeteringLatest`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoSAMeteringLatest`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoSAMeteringLatest` AS select coalesce(`m`.`mcsa_id`,`q`.`mcsa_id`) AS `mcsa_id`,coalesce(`m`.`mcsa_client_id`,`q`.`mcsa_client_id`) AS `mcsa_client_id`,coalesce(`m`.`mcsa_client`,`q`.`mcsa_client`) AS `mcsa_client`,coalesce(`m`.`mcsa_domain`,`q`.`mcsa_domain`) AS `mcsa_domain`,coalesce(`m`.`mcsa_product_id`,`q`.`mcsa_product_id`) AS `mcsa_product_id`,coalesce(`m`.`mcsa_license`,`q`.`mcsa_license`) AS `mcsa_license`,coalesce(`m`.`mcsa_license_type`,`q`.`mcsa_license_type`) AS `mcsa_license_type`,coalesce(`m`.`mcsa_virtual_account`,`q`.`mcsa_virtual_account`) AS `mcsa_virtual_account`,`m`.`mcsa_available_to_use` AS `mcsa_available_to_use`,`m`.`mcsa_in_use` AS `mcsa_in_use`,`m`.`mcsa_balance` AS `mcsa_balance`,`q`.`mcsa_quantity` AS `mcsa_quantity`,coalesce(`m`.`mcsa_compliance`,`q`.`mcsa_compliance`) AS `mcsa_compliance`,coalesce(`m`.`mcsa_subscription`,`q`.`mcsa_subscription`) AS `mcsa_subscription`,coalesce(`m`.`mcsa_start_date`,`q`.`mcsa_start_date`) AS `mcsa_start_date`,coalesce(`m`.`mcsa_end_date`,`q`.`mcsa_end_date`) AS `mcsa_end_date`,`m`.`mcsa_update` AS `mcsa_metering_update`,`q`.`mcsa_update` AS `mcsa_quantity_update` from ((select `x`.`mcsa_id` AS `mcsa_id`,`x`.`mcsa_row_type` AS `mcsa_row_type`,`x`.`mcsa_client_id` AS `mcsa_client_id`,`x`.`mcsa_client` AS `mcsa_client`,`x`.`mcsa_domain` AS `mcsa_domain`,`x`.`mcsa_product_id` AS `mcsa_product_id`,`x`.`mcsa_license` AS `mcsa_license`,`x`.`mcsa_virtual_account` AS `mcsa_virtual_account`,`x`.`mcsa_billing` AS `mcsa_billing`,`x`.`mcsa_available_to_use` AS `mcsa_available_to_use`,`x`.`mcsa_in_use` AS `mcsa_in_use`,`x`.`mcsa_balance` AS `mcsa_balance`,`x`.`mcsa_compliance` AS `mcsa_compliance`,`x`.`mcsa_license_type` AS `mcsa_license_type`,`x`.`mcsa_quantity` AS `mcsa_quantity`,`x`.`mcsa_subscription` AS `mcsa_subscription`,`x`.`mcsa_days_to_end` AS `mcsa_days_to_end`,`x`.`mcsa_active` AS `mcsa_active`,`x`.`mcsa_start_date` AS `mcsa_start_date`,`x`.`mcsa_end_date` AS `mcsa_end_date`,`x`.`mcsa_update` AS `mcsa_update`,`x`.`mcsa_track` AS `mcsa_track`,`x`.`rn` AS `rn` from (select `t`.`mcsa_id` AS `mcsa_id`,`t`.`mcsa_row_type` AS `mcsa_row_type`,`t`.`mcsa_client_id` AS `mcsa_client_id`,`t`.`mcsa_client` AS `mcsa_client`,`t`.`mcsa_domain` AS `mcsa_domain`,`t`.`mcsa_product_id` AS `mcsa_product_id`,`t`.`mcsa_license` AS `mcsa_license`,`t`.`mcsa_virtual_account` AS `mcsa_virtual_account`,`t`.`mcsa_billing` AS `mcsa_billing`,`t`.`mcsa_available_to_use` AS `mcsa_available_to_use`,`t`.`mcsa_in_use` AS `mcsa_in_use`,`t`.`mcsa_balance` AS `mcsa_balance`,`t`.`mcsa_compliance` AS `mcsa_compliance`,`t`.`mcsa_license_type` AS `mcsa_license_type`,`t`.`mcsa_quantity` AS `mcsa_quantity`,`t`.`mcsa_subscription` AS `mcsa_subscription`,`t`.`mcsa_days_to_end` AS `mcsa_days_to_end`,`t`.`mcsa_active` AS `mcsa_active`,`t`.`mcsa_start_date` AS `mcsa_start_date`,`t`.`mcsa_end_date` AS `mcsa_end_date`,`t`.`mcsa_update` AS `mcsa_update`,`t`.`mcsa_track` AS `mcsa_track`,row_number() over ( partition by `t`.`mcsa_client_id`,`t`.`mcsa_domain`,`t`.`mcsa_license`,`t`.`mcsa_virtual_account`,`t`.`mcsa_subscription` order by `t`.`mcsa_update` desc,`t`.`mcsa_id` desc) AS `rn` from `tbCiscoSmartAccountMetering` `t` where `t`.`mcsa_row_type` = 'metering') `x` where `x`.`rn` = 1) `m` left join (select `x`.`mcsa_id` AS `mcsa_id`,`x`.`mcsa_row_type` AS `mcsa_row_type`,`x`.`mcsa_client_id` AS `mcsa_client_id`,`x`.`mcsa_client` AS `mcsa_client`,`x`.`mcsa_domain` AS `mcsa_domain`,`x`.`mcsa_product_id` AS `mcsa_product_id`,`x`.`mcsa_license` AS `mcsa_license`,`x`.`mcsa_virtual_account` AS `mcsa_virtual_account`,`x`.`mcsa_billing` AS `mcsa_billing`,`x`.`mcsa_available_to_use` AS `mcsa_available_to_use`,`x`.`mcsa_in_use` AS `mcsa_in_use`,`x`.`mcsa_balance` AS `mcsa_balance`,`x`.`mcsa_compliance` AS `mcsa_compliance`,`x`.`mcsa_license_type` AS `mcsa_license_type`,`x`.`mcsa_quantity` AS `mcsa_quantity`,`x`.`mcsa_subscription` AS `mcsa_subscription`,`x`.`mcsa_days_to_end` AS `mcsa_days_to_end`,`x`.`mcsa_active` AS `mcsa_active`,`x`.`mcsa_start_date` AS `mcsa_start_date`,`x`.`mcsa_end_date` AS `mcsa_end_date`,`x`.`mcsa_update` AS `mcsa_update`,`x`.`mcsa_track` AS `mcsa_track`,`x`.`rn` AS `rn` from (select `t`.`mcsa_id` AS `mcsa_id`,`t`.`mcsa_row_type` AS `mcsa_row_type`,`t`.`mcsa_client_id` AS `mcsa_client_id`,`t`.`mcsa_client` AS `mcsa_client`,`t`.`mcsa_domain` AS `mcsa_domain`,`t`.`mcsa_product_id` AS `mcsa_product_id`,`t`.`mcsa_license` AS `mcsa_license`,`t`.`mcsa_virtual_account` AS `mcsa_virtual_account`,`t`.`mcsa_billing` AS `mcsa_billing`,`t`.`mcsa_available_to_use` AS `mcsa_available_to_use`,`t`.`mcsa_in_use` AS `mcsa_in_use`,`t`.`mcsa_balance` AS `mcsa_balance`,`t`.`mcsa_compliance` AS `mcsa_compliance`,`t`.`mcsa_license_type` AS `mcsa_license_type`,`t`.`mcsa_quantity` AS `mcsa_quantity`,`t`.`mcsa_subscription` AS `mcsa_subscription`,`t`.`mcsa_days_to_end` AS `mcsa_days_to_end`,`t`.`mcsa_active` AS `mcsa_active`,`t`.`mcsa_start_date` AS `mcsa_start_date`,`t`.`mcsa_end_date` AS `mcsa_end_date`,`t`.`mcsa_update` AS `mcsa_update`,`t`.`mcsa_track` AS `mcsa_track`,row_number() over ( partition by `t`.`mcsa_client_id`,`t`.`mcsa_domain`,`t`.`mcsa_license`,`t`.`mcsa_virtual_account`,`t`.`mcsa_subscription` order by `t`.`mcsa_update` desc,`t`.`mcsa_id` desc) AS `rn` from `tbCiscoSmartAccountMetering` `t` where `t`.`mcsa_row_type` = 'quantity') `x` where `x`.`rn` = 1) `q` on(`q`.`mcsa_client_id` = `m`.`mcsa_client_id` and `q`.`mcsa_domain` = `m`.`mcsa_domain` and `q`.`mcsa_license` = `m`.`mcsa_license` and `q`.`mcsa_virtual_account` = `m`.`mcsa_virtual_account` and `q`.`mcsa_subscription` = `m`.`mcsa_subscription`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCiscoSPIArchitecture`
--

/*!50001 DROP VIEW IF EXISTS `vwCiscoSPIArchitecture`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCiscoSPIArchitecture` AS select `tbCiscoSPI`.`spi_architecture` AS `spi_architecture`,`tbCiscoSPI`.`spi_solution_domain` AS `spi_solution_domain`,`tbCiscoSPI`.`spi_use_case` AS `spi_use_case` from `tbCiscoSPI` group by `tbCiscoSPI`.`spi_architecture`,`tbCiscoSPI`.`spi_solution_domain`,`tbCiscoSPI`.`spi_use_case` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCompanyAssetTracking`
--

/*!50001 DROP VIEW IF EXISTS `vwCompanyAssetTracking`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCompanyAssetTracking` AS select `c`.`company_id` AS `CompanyId`,`c`.`company_name` AS `CompanyName` from (`tbCompany` `c` join `tbAssetTracking` `t` on(`c`.`company_id` = `t`.`tracking_company_id`)) group by `c`.`company_id`,`c`.`company_name` order by `c`.`company_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCompanySite`
--

/*!50001 DROP VIEW IF EXISTS `vwCompanySite`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCompanySite` AS select `cs`.`site_id` AS `site_id`,`cs`.`site_company_id` AS `site_company_id`,`cs`.`site_name` AS `site_name`,`cs`.`site_cnpj` AS `site_cnpj`,`cs`.`site_ie` AS `site_ie`,`cs`.`site_address` AS `site_address`,`cs`.`site_city` AS `site_city`,`cs`.`site_uf` AS `site_uf`,`cs`.`site_country` AS `site_country`,`c`.`company_name` AS `company_name` from (`tbCompanySite` `cs` join `tbCompany` `c` on(`cs`.`site_company_id` = `c`.`company_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCompanySiteAsset`
--

/*!50001 DROP VIEW IF EXISTS `vwCompanySiteAsset`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCompanySiteAsset` AS select `it`.`tracking_id` AS `tracking_id`,`it`.`tracking_company_id` AS `tracking_company_id`,`it`.`tracking_site_id` AS `tracking_site_id`,`s`.`site_name` AS `tracking_site_name`,`it`.`tracking_asset_id` AS `tracking_asset_id`,`it`.`tracking_operation` AS `tracking_operation`,`it`.`tracking_operation_by` AS `tracking_operation_by`,`it`.`tracking_operation_date` AS `tracking_operation_date`,`it`.`tracking_ov` AS `tracking_ov`,`it`.`tracking_nf` AS `tracking_nf`,`it`.`tracking_remark` AS `tracking_remark`,`c`.`company_name` AS `tracking_company_name`,`i`.`asset_serial_number` AS `asset_serial_number`,`i`.`asset_instance_number` AS `asset_instance_number`,`p`.`product_name` AS `asset_product_name`,`p`.`product_description` AS `asset_product_description` from ((((`tbAssetTracking` `it` join `tbCompanySite` `s` on(`it`.`tracking_site_id` = `s`.`site_id`)) join `tbCompany` `c` on(`it`.`tracking_company_id` = `c`.`company_id`)) join `tbAsset` `i` on(`it`.`tracking_asset_id` = `i`.`asset_id`)) join `tbProduct` `p` on(`i`.`asset_product_id` = `p`.`product_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwContractClient`
--

/*!50001 DROP VIEW IF EXISTS `vwContractClient`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwContractClient` AS select `tb1`.`company_id` AS `client_id`,`tb1`.`company_name` AS `client_name` from (select `cn`.`company_id` AS `company_id`,`cn`.`company_name` AS `company_name` from (`tbContractNTTAsset` `n` join `tbCompany` `cn` on(`n`.`nttasset_customer_id` = `cn`.`company_id`)) group by `cn`.`company_id`,`cn`.`company_name` union select `cv`.`company_id` AS `company_id`,`cv`.`company_name` AS `company_name` from (`tbContractVendorAsset` `v` join `tbCompany` `cv` on(`v`.`vendorasset_customer_id` = `cv`.`company_id`)) group by `cv`.`company_id`,`cv`.`company_name`) `tb1` order by `tb1`.`company_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwContractEndDate`
--

/*!50001 DROP VIEW IF EXISTS `vwContractEndDate`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwContractEndDate` AS select distinct `i`.`asset_id` AS `asset_id`,`p`.`product_name` AS `product_name`,`p`.`product_subtype` AS `product_subtype`,`p`.`product_vendor_id` AS `product_vendor_id`,`cp`.`company_name` AS `product_vendor_name`,`i`.`asset_serial_number` AS `serial_number`,`i`.`asset_parent_serial_number` AS `parent_serial_number`,`i`.`asset_instance_number` AS `instance_number`,`i`.`asset_parent_instance_number` AS `parent_instance_number`,`i`.`asset_parent_level` AS `major_minor`,`n`.`nttasset_customer_id` AS `ntt_contract_client_id`,`cn`.`company_name` AS `ntt_contract_client_name`,`n`.`nttasset_contract_number` AS `ntt_contract_num`,`n`.`nttasset_vendor_name` AS `ntt_contract_vendor`,`n`.`nttasset_subscription_id` AS `ntt_contract_subscription`,`n`.`nttasset_oracle_id` AS `ntt_contract_id_oracle`,`n`.`nttasset_line` AS `ntt_contract_oracle_line`,`n`.`nttasset_subline` AS `ntt_contract_oracle_subline`,`n`.`nttasset_entitlement` AS `ntt_contract_entitlement`,`n`.`nttasset_ov` AS `ntt_contract_ov`,`n`.`nttasset_po` AS `ntt_contract_po`,least(`n`.`nttasset_contract_start`,`n`.`nttasset_asset_start`) AS `ntt_contract_start_date`,least(`n`.`nttasset_contract_end`,`n`.`nttasset_asset_end`) AS `ntt_contract_end_date`,`v`.`vendorasset_customer_id` AS `vendor_contract_client_id`,`cv`.`company_name` AS `vendor_contract_client_name`,`v`.`vendorasset_contract_num` AS `vendor_contract_num`,`v`.`vendorasset_vendor_name` AS `vendor_contract_vendor`,`v`.`vendorasset_subscription_id` AS `vendor_contract_subscription`,`v`.`vendorasset_web_order_id` AS `vendor_contract_web_order`,`v`.`vendorasset_deal_id` AS `vendor_contract_deal_id`,`v`.`vendorasset_quote` AS `vendor_contract_quote`,`v`.`vendorasset_product_so` AS `vendor_contract_product_so`,`v`.`vendorasset_product_po` AS `vendor_contract_product_po`,`v`.`vendorasset_service_so` AS `vendor_contract_service_so`,`v`.`vendorasset_service_po` AS `vendor_contract_service_po`,`v`.`vendorasset_start` AS `vendor_contract_start_date`,`v`.`vendorasset_end` AS `vendor_contract_end_date`,least(coalesce(`n`.`nttasset_contract_end`,'9999-12-31'),coalesce(`n`.`nttasset_asset_end`,'9999-12-31'),coalesce(`v`.`vendorasset_end`,'9999-12-31')) AS `shortest_end_date`,case when least(`n`.`nttasset_contract_end`,`n`.`nttasset_asset_end`) is not null and `v`.`vendorasset_end` is not null then case when least(`n`.`nttasset_contract_end`,`n`.`nttasset_asset_end`) = `v`.`vendorasset_end` then 'same end date' else 'different end date' end else '-' end AS `comparing_end_date` from ((((((`tbAsset` `i` join `tbProduct` `p` on(`i`.`asset_product_id` = `p`.`product_id`)) left join `tbCompany` `cp` on(`p`.`product_vendor_id` = `cp`.`company_id`)) left join `tbContractNTTAsset` `n` on(`i`.`asset_id` = `n`.`nttasset_asset_id`)) left join `tbCompany` `cn` on(`n`.`nttasset_customer_id` = `cn`.`company_id`)) left join `tbContractVendorAsset` `v` on(`i`.`asset_id` = `v`.`vendorasset_asset_id`)) left join `tbCompany` `cv` on(`v`.`vendorasset_customer_id` = `cv`.`company_id`)) where `n`.`nttasset_asset_id` is not null or `v`.`vendorasset_asset_id` is not null */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwContractNTTAsset`
--

/*!50001 DROP VIEW IF EXISTS `vwContractNTTAsset`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwContractNTTAsset` AS select `c`.`nttasset_id` AS `nttasset_id`,`c`.`nttasset_vendor_id` AS `nttasset_vendor_id`,`c`.`nttasset_vendor_name` AS `nttasset_vendor_name`,`c`.`nttasset_nttcontract_id` AS `nttasset_nttcontract_id`,`c`.`nttasset_contract_number` AS `nttasset_contract_number`,`c`.`nttasset_customer_id` AS `nttasset_customer_id`,`c`.`nttasset_customer_name` AS `nttasset_customer_name`,`c`.`nttasset_am_id` AS `nttasset_am_id`,`c`.`nttasset_am_name` AS `nttasset_am_name`,`c`.`nttasset_asset_id` AS `nttasset_asset_id`,`c`.`nttasset_product_id` AS `nttasset_product_id`,`c`.`nttasset_product` AS `nttasset_product`,`c`.`nttasset_contract_description` AS `nttasset_contract_description`,`c`.`nttasset_serial_num` AS `nttasset_serial_num`,`c`.`nttasset_instance_num` AS `nttasset_instance_num`,`c`.`nttasset_subscription_id` AS `nttasset_subscription_id`,`c`.`nttasset_oracle_id` AS `nttasset_oracle_id`,`c`.`nttasset_line` AS `nttasset_line`,`c`.`nttasset_subline` AS `nttasset_subline`,`c`.`nttasset_apolo_id` AS `nttasset_apolo_id`,`c`.`nttasset_entitlement_id` AS `nttasset_entitlement_id`,`c`.`nttasset_entitlement` AS `nttasset_entitlement`,`c`.`nttasset_ov` AS `nttasset_ov`,`c`.`nttasset_po` AS `nttasset_po`,`c`.`nttasset_contract_start` AS `nttasset_contract_start`,`c`.`nttasset_contract_end` AS `nttasset_contract_end`,`c`.`nttasset_asset_start` AS `nttasset_asset_start`,`c`.`nttasset_asset_end` AS `nttasset_asset_end`,`c`.`nttasset_product_status` AS `nttasset_product_status`,`c`.`nttasset_city` AS `nttasset_city`,`c`.`nttasset_status_renewal` AS `nttasset_status_renewal`,`c`.`nttasset_parts_contract` AS `nttasset_parts_contract`,`c`.`nttasset_quote_ref` AS `nttasset_quote_ref`,`c`.`nttasset_service_status` AS `nttasset_service_status`,`c`.`nttasset_quote` AS `nttasset_quote`,`c`.`nttasset_shortdescription` AS `nttasset_shortdescription`,`c`.`nttasset_gross_profit` AS `nttasset_gross_profit`,`c`.`nttasset_price` AS `nttasset_price`,`c`.`nttasset_currency` AS `nttasset_currency`,`c`.`nttasset_quantity` AS `nttasset_quantity`,`c`.`nttasset_contract_amount` AS `nttasset_contract_amount`,`c`.`nttasset_acc_rule` AS `nttasset_acc_rule`,`c`.`nttasset_date_terminated` AS `nttasset_date_terminated`,`a`.`asset_id` AS `asset_id`,`a`.`asset_product_id` AS `asset_product_id`,`a`.`asset_ponumber` AS `asset_ponumber`,`a`.`asset_sonumber` AS `asset_sonumber`,`a`.`asset_type` AS `asset_type`,`a`.`asset_subscription_id` AS `asset_subscription_id`,`a`.`asset_serial_number` AS `asset_serial_number`,`a`.`asset_parent_serial_number` AS `asset_parent_serial_number`,`a`.`asset_instance_number` AS `asset_instance_number`,`a`.`asset_parent_instance_number` AS `asset_parent_instance_number`,`a`.`asset_parent_level` AS `asset_parent_level`,`a`.`asset_sales_order` AS `asset_sales_order`,`a`.`asset_web_order_id` AS `asset_web_order_id`,`a`.`asset_deal_id` AS `asset_deal_id`,`a`.`asset_price` AS `asset_price`,`a`.`asset_rfid` AS `asset_rfid`,`a`.`asset_ov` AS `asset_ov`,`a`.`asset_warehouse` AS `asset_warehouse`,`p`.`product_id` AS `product_id`,`p`.`product_manufacturer_id` AS `product_manufacturer_id`,`p`.`product_manufacturer_name` AS `product_manufacturer_name`,`p`.`product_vendor_id` AS `product_vendor_id`,`p`.`product_name` AS `product_name`,`p`.`product_family` AS `product_family`,`p`.`product_subfamily` AS `product_subfamily`,`p`.`product_group` AS `product_group`,`p`.`product_subtype` AS `product_subtype`,`p`.`product_type` AS `product_type`,`p`.`product_business_entity` AS `product_business_entity`,`p`.`product_subbusiness_entity` AS `product_subbusiness_entity`,`p`.`product_description` AS `product_description`,`p`.`product_endofsupport` AS `product_endofsupport`,`p`.`product_endofsoftwaremaintenance` AS `product_endofsoftwaremaintenance`,`p`.`product_endofsale` AS `product_endofsale`,`p`.`product_bulletin` AS `product_bulletin`,`p`.`product_pid_mapping_group` AS `product_pid_mapping_group`,`p`.`product_remark` AS `product_remark`,`v`.`company_name` AS `product_vendor_name` from (((`tbContractNTTAsset` `c` join `tbAsset` `a` on(`c`.`nttasset_asset_id` = `a`.`asset_id`)) join `tbProduct` `p` on(`a`.`asset_product_id` = `p`.`product_id`)) left join `tbCompany` `v` on(`p`.`product_vendor_id` = `v`.`company_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwContractNTTMMR`
--

/*!50001 DROP VIEW IF EXISTS `vwContractNTTMMR`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwContractNTTMMR` AS select `c`.`nttasset_customer_id` AS `customer_id`,`c`.`nttasset_contract_number` AS `contract_number`,min(`c`.`nttasset_contract_start`) AS `contract_start_date`,max(`c`.`nttasset_contract_end`) AS `contract_start_end`,max(`c`.`nttasset_contract_amount`) AS `contract_amount`,timestampdiff(MONTH,min(`c`.`nttasset_contract_start`),max(`c`.`nttasset_contract_end`)) + 1 AS `contract_months`,case when timestampdiff(MONTH,min(`c`.`nttasset_contract_start`),max(`c`.`nttasset_contract_end`)) + 1 > 0 then max(`c`.`nttasset_contract_amount`) / (timestampdiff(MONTH,min(`c`.`nttasset_contract_start`),max(`c`.`nttasset_contract_end`)) + 1) else 0 end AS `contract_mrr`,case when max(`c`.`nttasset_contract_end`) < curdate() then 'EXPIRED' else 'ACTIVE' end AS `contract_status` from `tbContractNTTAsset` `c` where `c`.`nttasset_entitlement_id` in (2,6,8,190) group by `c`.`nttasset_customer_id`,`c`.`nttasset_contract_number`,`c`.`nttasset_contract_start`,`c`.`nttasset_contract_end`,`c`.`nttasset_contract_amount` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwContractVendorAsset`
--

/*!50001 DROP VIEW IF EXISTS `vwContractVendorAsset`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwContractVendorAsset` AS select `c`.`vendorasset_id` AS `vendorasset_id`,`c`.`vendorasset_contract_num` AS `vendorasset_contract_num`,`c`.`vendorasset_vendor_id` AS `vendorasset_vendor_id`,`cv`.`company_name` AS `vendorasset_vendor_name`,`c`.`vendorasset_customer_id` AS `vendorasset_customer_id`,`cl`.`company_name` AS `vendorasset_customer_name`,`c`.`vendorasset_asset_id` AS `vendorasset_asset_id`,`c`.`vendorasset_product_id` AS `vendorasset_product_id`,`c`.`vendorasset_start` AS `vendorasset_start`,`c`.`vendorasset_end` AS `vendorasset_end`,`c`.`vendorasset_status` AS `vendorasset_status`,`c`.`vendorasset_renewal` AS `vendorasset_renewal`,`c`.`vendorasset_auto_renewal` AS `vendorasset_auto_renewal`,`c`.`vendorasset_billing_frequency` AS `vendorasset_billing_frequency`,`c`.`vendorasset_service_level` AS `vendorasset_service_level`,`c`.`vendorasset_sku` AS `vendorasset_sku`,`c`.`vendorasset_quantity` AS `vendorasset_quantity`,`c`.`vendorasset_product_price` AS `vendorasset_product_price`,`c`.`vendorasset_service_price` AS `vendorasset_service_price`,`c`.`vendorasset_subscription_id` AS `vendorasset_subscription_id`,`c`.`vendorasset_web_order_id` AS `vendorasset_web_order_id`,`c`.`vendorasset_deal_id` AS `vendorasset_deal_id`,`c`.`vendorasset_installed_status` AS `vendorasset_installed_status`,`c`.`vendorasset_smart_account` AS `vendorasset_smart_account`,`c`.`vendorasset_product_so` AS `vendorasset_product_so`,`c`.`vendorasset_product_po` AS `vendorasset_product_po`,`c`.`vendorasset_service_so` AS `vendorasset_service_so`,`c`.`vendorasset_service_po` AS `vendorasset_service_po`,`c`.`vendorasset_maintenance_so` AS `vendorasset_maintenance_so`,`c`.`vendorasset_maintenance_po` AS `vendorasset_maintenance_po`,`c`.`vendorasset_quote` AS `vendorasset_quote`,`c`.`vendorasset_contract_type` AS `vendorasset_contract_type`,`c`.`vendorasset_coverage` AS `vendorasset_coverage`,`c`.`vendorasset_coverage_status` AS `vendorasset_coverage_status`,`c`.`vendorasset_buying_program` AS `vendorasset_buying_program`,`c`.`vendorasset_suport_service_level` AS `vendorasset_suport_service_level`,`c`.`vendorasset_install_site_gu_name` AS `vendorasset_install_site_gu_name`,`c`.`vendorasset_install_site_cr_parent_name` AS `vendorasset_install_site_cr_parent_name`,`c`.`vendorasset_install_site_cr_party_name` AS `vendorasset_install_site_cr_party_name`,`c`.`vendorasset_install_site_name` AS `vendorasset_install_site_name`,`c`.`vendorasset_best_partner_be_geo_id` AS `vendorasset_best_partner_be_geo_id`,`c`.`vendorasset_best_partner_be_geo_name` AS `vendorasset_best_partner_be_geo_name`,`c`.`vendorasset_product_bill_to_partner_name` AS `vendorasset_product_bill_to_partner_name`,`c`.`vendorasset_product_partner_geo_geo_name` AS `vendorasset_product_partner_geo_geo_name`,`c`.`vendorasset_pos_partner_be_geo_name` AS `vendorasset_pos_partner_be_geo_name`,`c`.`vendorasset_service_bill_partner_name` AS `vendorasset_service_bill_partner_name`,`c`.`vendorasset_service_partner_be_geo_name` AS `vendorasset_service_partner_be_geo_name`,`c`.`vendorasset_service_indicator` AS `vendorasset_service_indicator`,`c`.`vendorasset_date_booked` AS `vendorasset_date_booked`,`c`.`vendorasset_date_ordered` AS `vendorasset_date_ordered`,`c`.`vendorasset_remark` AS `vendorasset_remark`,`c`.`vendorasset_contract_description` AS `vendorasset_contract_description`,`c`.`vendorasset_migration_pid_list` AS `vendorasset_migration_pid_list`,`c`.`vendorasset_existing_coverage_level_list_price` AS `vendorasset_existing_coverage_level_list_price`,`c`.`vendorasset_atr_eligible` AS `vendorasset_atr_eligible`,`c`.`vendorasset_do_not_renew_reason` AS `vendorasset_do_not_renew_reason`,`c`.`vendorasset_end_fy_vendor` AS `vendorasset_end_fy_vendor`,`c`.`vendorasset_end_fq_vendor` AS `vendorasset_end_fq_vendor`,`c`.`vendorasset_end_fy_ntt` AS `vendorasset_end_fy_ntt`,`c`.`vendorasset_end_fq_ntt` AS `vendorasset_end_fq_ntt`,`c`.`vendorasset_end_fy_calendar` AS `vendorasset_end_fy_calendar`,`c`.`vendorasset_end_fq_calendar` AS `vendorasset_end_fq_calendar`,`i`.`asset_id` AS `asset_id`,`i`.`asset_product_id` AS `asset_product_id`,`i`.`asset_ponumber` AS `asset_ponumber`,`i`.`asset_sonumber` AS `asset_sonumber`,`i`.`asset_type` AS `asset_type`,`i`.`asset_subscription_id` AS `asset_subscription_id`,`i`.`asset_serial_number` AS `asset_serial_number`,`i`.`asset_parent_serial_number` AS `asset_parent_serial_number`,`i`.`asset_instance_number` AS `asset_instance_number`,`i`.`asset_parent_instance_number` AS `asset_parent_instance_number`,`i`.`asset_parent_level` AS `asset_parent_level`,`i`.`asset_sales_order` AS `asset_sales_order`,`i`.`asset_web_order_id` AS `asset_web_order_id`,`i`.`asset_deal_id` AS `asset_deal_id`,`i`.`asset_price` AS `asset_price`,`i`.`asset_rfid` AS `asset_rfid`,`i`.`asset_ov` AS `asset_ov`,`i`.`asset_warehouse` AS `asset_warehouse`,`p`.`product_id` AS `product_id`,`p`.`product_manufacturer_id` AS `product_manufacturer_id`,`p`.`product_manufacturer_name` AS `product_manufacturer_name`,`p`.`product_vendor_id` AS `product_vendor_id`,`p`.`product_name` AS `product_name`,`p`.`product_family` AS `product_family`,`p`.`product_subfamily` AS `product_subfamily`,`p`.`product_group` AS `product_group`,`p`.`product_subtype` AS `product_subtype`,`p`.`product_type` AS `product_type`,`p`.`product_business_entity` AS `product_business_entity`,`p`.`product_subbusiness_entity` AS `product_subbusiness_entity`,`p`.`product_description` AS `product_description`,`p`.`product_endofsupport` AS `product_endofsupport`,`p`.`product_endofsoftwaremaintenance` AS `product_endofsoftwaremaintenance`,`p`.`product_endofsale` AS `product_endofsale`,`p`.`product_bulletin` AS `product_bulletin`,`p`.`product_pid_mapping_group` AS `product_pid_mapping_group`,`p`.`product_remark` AS `product_remark`,`pv`.`company_name` AS `product_vendor_name` from (((((`tbContractVendorAsset` `c` join `tbAsset` `i` on(`c`.`vendorasset_asset_id` = `i`.`asset_id`)) join `tbProduct` `p` on(`i`.`asset_product_id` = `p`.`product_id`)) left join `tbCompany` `cv` on(`c`.`vendorasset_vendor_id` = `cv`.`company_id`)) left join `tbCompany` `pv` on(`p`.`product_vendor_id` = `pv`.`company_id`)) left join `tbCompany` `cl` on(`c`.`vendorasset_customer_id` = `cl`.`company_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCustomerCiscoEAConsolidated`
--

/*!50001 DROP VIEW IF EXISTS `vwCustomerCiscoEAConsolidated`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCustomerCiscoEAConsolidated` AS with cisco_latest as (select `x`.`customer_id` AS `customer_id`,`x`.`subscription_id` AS `subscription_id`,`x`.`product_id` AS `product_id`,`x`.`start_date` AS `start_date`,`x`.`end_date` AS `end_date` from (select `ce`.`ea_end_customer_id` AS `customer_id`,`ce`.`ea_subscription_id` AS `subscription_id`,`ce`.`ea_product_id` AS `product_id`,`ce`.`ea_start_date` AS `start_date`,`ce`.`ea_end_date` AS `end_date`,row_number() over ( partition by `ce`.`ea_end_customer_id`,`ce`.`ea_subscription_id`,`ce`.`ea_product_id` order by coalesce(`ce`.`ea_end_date`,cast('9999-12-31' as date)) desc,coalesce(`ce`.`ea_start_date`,cast('9999-12-31' as date)) desc) AS `rn` from `tbCiscoEA` `ce` where `ce`.`ea_product_id` in (5194,5533)) `x` where `x`.`rn` = 1), measure_latest as (select `x`.`customer_id` AS `customer_id`,`x`.`subscription_id` AS `subscription_id`,`x`.`product_id` AS `product_id`,`x`.`start_date` AS `start_date`,`x`.`end_date` AS `end_date`,`x`.`ea_suite` AS `ea_suite` from (select `me`.`mcea_client_id` AS `customer_id`,`me`.`mcea_subscription` AS `subscription_id`,`me`.`mcea_product_id` AS `product_id`,`me`.`mcea_start_date` AS `start_date`,`me`.`mcea_end_date` AS `end_date`,`me`.`mcea_suite_name` AS `ea_suite`,row_number() over ( partition by `me`.`mcea_client_id`,`me`.`mcea_subscription`,`me`.`mcea_product_id`,`me`.`mcea_suite_name` order by coalesce(`me`.`mcea_end_date`,cast('9999-12-31' as date)) desc,coalesce(`me`.`mcea_start_date`,cast('9999-12-31' as date)) desc) AS `rn` from `tbCiscoEnterpriseAgreementMetering` `me`) `x` where `x`.`rn` = 1), base_keys as (select `cl`.`customer_id` AS `customer_id`,`cl`.`subscription_id` AS `subscription_id`,`cl`.`start_date` AS `start_date`,`cl`.`end_date` AS `end_date` from `cisco_latest` `cl` union select `ml`.`customer_id` AS `customer_id`,`ml`.`subscription_id` AS `subscription_id`,`ml`.`start_date` AS `start_date`,`ml`.`end_date` AS `end_date` from `measure_latest` `ml`), base_consolidated as (select `bk`.`customer_id` AS `customer_id`,`co`.`company_name` AS `customer_name`,`bk`.`subscription_id` AS `subscription_id`,`bk`.`start_date` AS `start_date`,`bk`.`end_date` AS `end_date`,case when `bk`.`end_date` is null then 'UNDEFINED' when `bk`.`end_date` >= curdate() then 'ACTIVE' else 'EXPIRATED' end AS `contract_status` from (`base_keys` `bk` left join `tbCompany` `co` on(`co`.`company_id` = `bk`.`customer_id`))), ea_type_agg as (select `cl`.`customer_id` AS `customer_id`,`cl`.`subscription_id` AS `subscription_id`,`cl`.`start_date` AS `start_date`,`cl`.`end_date` AS `end_date`,group_concat(distinct `p`.`product_part_number` order by `p`.`product_part_number` ASC separator ', ') AS `ea_type` from (`cisco_latest` `cl` join `tbProduct` `p` on(`p`.`product_id` = `cl`.`product_id`)) group by `cl`.`customer_id`,`cl`.`subscription_id`,`cl`.`start_date`,`cl`.`end_date`), ea_suite_agg as (select `ml`.`customer_id` AS `customer_id`,`ml`.`subscription_id` AS `subscription_id`,`ml`.`start_date` AS `start_date`,`ml`.`end_date` AS `end_date`,group_concat(distinct `ml`.`ea_suite` order by `ml`.`ea_suite` ASC separator ', ') AS `ea_suite` from `measure_latest` `ml` group by `ml`.`customer_id`,`ml`.`subscription_id`,`ml`.`start_date`,`ml`.`end_date`), task_onboard_raw as (select `t`.`task_id` AS `task_id`,`t`.`task_customer_id` AS `customer_id`,`t`.`task_ws` AS `subscription_id`,`ta`.`activity_id` AS `activity_id`,`ta`.`activity_name` AS `activity_name`,`ta`.`activity_status` AS `activity_status`,`ta`.`activity_end_performed` AS `activity_end_performed` from (`tbTask` `t` join `tbTaskActivity` `ta` on(`ta`.`activity_task_id` = `t`.`task_id`)) where `t`.`task_tasktype_id` = 1 and lcase(`ta`.`activity_name`) like '%onboard%'), task_onboard_ref as (select `z`.`customer_id` AS `customer_id`,`z`.`subscription_id` AS `subscription_id`,`z`.`activity_id` AS `activity_id`,`z`.`activity_status` AS `activity_status`,`z`.`activity_end_performed` AS `activity_end_performed` from (select `tor`.`task_id` AS `task_id`,`tor`.`customer_id` AS `customer_id`,`tor`.`subscription_id` AS `subscription_id`,`tor`.`activity_id` AS `activity_id`,`tor`.`activity_name` AS `activity_name`,`tor`.`activity_status` AS `activity_status`,`tor`.`activity_end_performed` AS `activity_end_performed`,row_number() over ( partition by `tor`.`customer_id`,`tor`.`subscription_id` order by `tor`.`activity_end_performed` is null,`tor`.`activity_end_performed` desc,`tor`.`activity_id` desc) AS `rn` from `task_onboard_raw` `tor`) `z` where `z`.`rn` = 1), onboard_status_agg as (select `r`.`customer_id` AS `customer_id`,`r`.`subscription_id` AS `subscription_id`,`r`.`activity_end_performed` AS `activity_end_performed`,case when `r`.`activity_status` in (4,5,6) then 'NOT COMPLETED' when `r`.`activity_status` = 10 and `r`.`activity_end_performed` is not null and `r`.`activity_end_performed` <= curdate() then 'COMPLETED' else 'PENDING' end AS `onboard_status` from `task_onboard_ref` `r`), account_team_base as (select `at`.`accountteam_company_id` AS `customer_id`,`at`.`accountteam_user_id` AS `accountteam_user_id`,`at`.`accountteam_user_type` AS `accountteam_user_type`,`at`.`accountteam_allocated` AS `accountteam_allocated`,`at`.`accountteam_allocation_start_date` AS `accountteam_allocation_start_date`,`at`.`accountteam_allocation_end_date` AS `accountteam_allocation_end_date`,`u`.`user_name` AS `user_name` from (`tbAccountTeam` `at` join `tbUser` `u` on(`u`.`user_id` = `at`.`accountteam_user_id`))), dir_agg as (select `account_team_base`.`customer_id` AS `customer_id`,max(`account_team_base`.`user_name`) AS `dir` from `account_team_base` where `account_team_base`.`accountteam_user_type` = 'DIR' and `account_team_base`.`accountteam_allocated` <> 0 group by `account_team_base`.`customer_id`), am_agg as (select `account_team_base`.`customer_id` AS `customer_id`,max(`account_team_base`.`user_name`) AS `am` from `account_team_base` where `account_team_base`.`accountteam_user_type` = 'AM' and `account_team_base`.`accountteam_allocated` <> 0 group by `account_team_base`.`customer_id`), csm_agg as (select `account_team_base`.`customer_id` AS `customer_id`,max(`account_team_base`.`user_name`) AS `csm` from `account_team_base` where `account_team_base`.`accountteam_user_type` = 'CSM' and `account_team_base`.`accountteam_allocated` <> 0 group by `account_team_base`.`customer_id`), rsa_agg as (select `account_team_base`.`customer_id` AS `customer_id`,max(`account_team_base`.`user_name`) AS `rsa` from `account_team_base` where `account_team_base`.`accountteam_user_type` = 'RSA' and `account_team_base`.`accountteam_allocated` <> 0 group by `account_team_base`.`customer_id`), pas_candidates as (select `bc`.`customer_id` AS `customer_id`,`bc`.`subscription_id` AS `subscription_id`,`bc`.`start_date` AS `start_date`,`bc`.`end_date` AS `end_date`,`os`.`activity_end_performed` AS `activity_end_performed`,`atb`.`user_name` AS `user_name`,`atb`.`accountteam_allocated` AS `accountteam_allocated`,`atb`.`accountteam_allocation_start_date` AS `accountteam_allocation_start_date`,`atb`.`accountteam_allocation_end_date` AS `accountteam_allocation_end_date`,case when `os`.`activity_end_performed` is null then `atb`.`accountteam_allocation_start_date` when `atb`.`accountteam_allocated` <> 0 then `atb`.`accountteam_allocation_start_date` else `atb`.`accountteam_allocation_end_date` end AS `reference_team_date` from ((`base_consolidated` `bc` left join `onboard_status_agg` `os` on(`os`.`customer_id` = `bc`.`customer_id` and `os`.`subscription_id` = `bc`.`subscription_id`)) join `account_team_base` `atb` on(`atb`.`customer_id` = `bc`.`customer_id` and `atb`.`accountteam_user_type` = 'PAS'))), pas_ranked as (select `pc`.`customer_id` AS `customer_id`,`pc`.`subscription_id` AS `subscription_id`,`pc`.`start_date` AS `start_date`,`pc`.`end_date` AS `end_date`,`pc`.`activity_end_performed` AS `activity_end_performed`,`pc`.`user_name` AS `user_name`,`pc`.`accountteam_allocated` AS `accountteam_allocated`,`pc`.`accountteam_allocation_start_date` AS `accountteam_allocation_start_date`,`pc`.`accountteam_allocation_end_date` AS `accountteam_allocation_end_date`,`pc`.`reference_team_date` AS `reference_team_date`,row_number() over ( partition by `pc`.`customer_id`,`pc`.`subscription_id`,`pc`.`start_date`,`pc`.`end_date` order by case when `pc`.`activity_end_performed` is null then coalesce(`pc`.`accountteam_allocation_start_date`,cast('1000-01-01' as date)) else abs(to_days(`pc`.`reference_team_date`) - to_days(`pc`.`activity_end_performed`)) end,`pc`.`accountteam_allocated` desc,coalesce(`pc`.`accountteam_allocation_start_date`,cast('1000-01-01' as date)) desc,`pc`.`user_name`) AS `rn` from `pas_candidates` `pc`), pas_agg as (select `pas_ranked`.`customer_id` AS `customer_id`,`pas_ranked`.`subscription_id` AS `subscription_id`,`pas_ranked`.`start_date` AS `start_date`,`pas_ranked`.`end_date` AS `end_date`,`pas_ranked`.`user_name` AS `pas` from `pas_ranked` where `pas_ranked`.`rn` = 1)select `bc`.`customer_id` AS `customer_id`,`bc`.`customer_name` AS `customer_name`,`eta`.`ea_type` AS `ea_type`,`bc`.`subscription_id` AS `subscription_id`,`esa`.`ea_suite` AS `ea_suite`,`bc`.`start_date` AS `start_date`,`bc`.`end_date` AS `end_date`,`bc`.`contract_status` AS `contract_status`,coalesce(`os`.`onboard_status`,'PENDING') AS `onboard_status`,`da`.`dir` AS `dir`,`aa`.`am` AS `am`,`ca`.`csm` AS `csm`,`ra`.`rsa` AS `rsa`,`pa`.`pas` AS `pas` from ((((((((`base_consolidated` `bc` left join `ea_type_agg` `eta` on(`eta`.`customer_id` = `bc`.`customer_id` and `eta`.`subscription_id` = `bc`.`subscription_id` and (`eta`.`start_date` = `bc`.`start_date` or `eta`.`start_date` is null and `bc`.`start_date` is null) and (`eta`.`end_date` = `bc`.`end_date` or `eta`.`end_date` is null and `bc`.`end_date` is null))) left join `ea_suite_agg` `esa` on(`esa`.`customer_id` = `bc`.`customer_id` and `esa`.`subscription_id` = `bc`.`subscription_id` and (`esa`.`start_date` = `bc`.`start_date` or `esa`.`start_date` is null and `bc`.`start_date` is null) and (`esa`.`end_date` = `bc`.`end_date` or `esa`.`end_date` is null and `bc`.`end_date` is null))) left join `onboard_status_agg` `os` on(`os`.`customer_id` = `bc`.`customer_id` and `os`.`subscription_id` = `bc`.`subscription_id`)) left join `dir_agg` `da` on(`da`.`customer_id` = `bc`.`customer_id`)) left join `am_agg` `aa` on(`aa`.`customer_id` = `bc`.`customer_id`)) left join `csm_agg` `ca` on(`ca`.`customer_id` = `bc`.`customer_id`)) left join `rsa_agg` `ra` on(`ra`.`customer_id` = `bc`.`customer_id`)) left join `pas_agg` `pa` on(`pa`.`customer_id` = `bc`.`customer_id` and `pa`.`subscription_id` = `bc`.`subscription_id` and (`pa`.`start_date` = `bc`.`start_date` or `pa`.`start_date` is null and `bc`.`start_date` is null) and (`pa`.`end_date` = `bc`.`end_date` or `pa`.`end_date` is null and `bc`.`end_date` is null))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCustomerCiscoLCIDealTrackProjectStatus`
--

/*!50001 DROP VIEW IF EXISTS `vwCustomerCiscoLCIDealTrackProjectStatus`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCustomerCiscoLCIDealTrackProjectStatus` AS with task_base as (select `t`.`task_id` AS `task_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `customer_name`,`t`.`task_track` AS `task_track`,`t`.`task_subtrack` AS `task_subtrack`,coalesce(`t`.`task_value`,0) AS `task_value`,`t`.`task_ws` AS `task_ws`,`t`.`task_deal_id` AS `task_deal_id`,`t`.`task_status` AS `task_status`,`s`.`statustype_name` AS `task_status_name`,coalesce(`t`.`task_project_id`,0) AS `task_project_id` from ((`tbTask` `t` join `tbCompany` `c` on(`c`.`company_id` = `t`.`task_customer_id`)) join `tbStatusType` `s` on(`s`.`statustype_id` = `t`.`task_status`)) where `t`.`task_tasktype_id` in (21,22) and `t`.`task_customer_id` <> 0 and `t`.`task_status` not in (4,5,6,10)), customer_track_deal_base as (select distinct `tb`.`task_customer_id` AS `task_customer_id`,`tb`.`customer_name` AS `customer_name`,`tb`.`task_track` AS `task_track`,`tb`.`task_deal_id` AS `task_deal_id` from `task_base` `tb`), has_project_calc as (select `tb`.`task_customer_id` AS `task_customer_id`,`tb`.`task_track` AS `task_track`,`tb`.`task_deal_id` AS `task_deal_id`,case when sum(case when `tb`.`task_project_id` > 0 and `tb`.`task_status` <> 1 then 1 else 0 end) > 0 then 'YES' when count(0) = sum(case when `tb`.`task_status` = 3 then 1 else 0 end) then 'IN REVIEW' when count(0) = sum(case when `tb`.`task_status` = 1 then 1 else 0 end) then 'PENDING REVIEW' else 'NO' end AS `has_project` from `task_base` `tb` group by `tb`.`task_customer_id`,`tb`.`task_track`,`tb`.`task_deal_id`), task_priority as (select `tb`.`task_id` AS `task_id`,`tb`.`task_customer_id` AS `task_customer_id`,`tb`.`customer_name` AS `customer_name`,`tb`.`task_track` AS `task_track`,`tb`.`task_subtrack` AS `task_subtrack`,`tb`.`task_value` AS `task_value`,`tb`.`task_ws` AS `task_ws`,`tb`.`task_deal_id` AS `task_deal_id`,`tb`.`task_status` AS `task_status`,`tb`.`task_status_name` AS `task_status_name`,`tb`.`task_project_id` AS `task_project_id`,case when `tb`.`task_status` not in (1,3) then 1 when `tb`.`task_status` = 3 then 2 when `tb`.`task_status` = 1 then 3 else 9 end AS `priority_group` from `task_base` `tb`), best_priority as (select `tp`.`task_customer_id` AS `task_customer_id`,`tp`.`task_track` AS `task_track`,`tp`.`task_deal_id` AS `task_deal_id`,min(`tp`.`priority_group`) AS `best_priority_group` from `task_priority` `tp` group by `tp`.`task_customer_id`,`tp`.`task_track`,`tp`.`task_deal_id`), min_value_by_priority as (select `tp`.`task_customer_id` AS `task_customer_id`,`tp`.`task_track` AS `task_track`,`tp`.`task_deal_id` AS `task_deal_id`,`bp`.`best_priority_group` AS `best_priority_group`,min(`tp`.`task_value`) AS `min_task_value` from (`task_priority` `tp` join `best_priority` `bp` on(`bp`.`task_customer_id` = `tp`.`task_customer_id` and `bp`.`task_track` = `tp`.`task_track` and `bp`.`task_deal_id` = `tp`.`task_deal_id` and `bp`.`best_priority_group` = `tp`.`priority_group`)) group by `tp`.`task_customer_id`,`tp`.`task_track`,`tp`.`task_deal_id`,`bp`.`best_priority_group`), selected_tasks as (select distinct `tp`.`task_id` AS `task_id`,`tp`.`task_customer_id` AS `task_customer_id`,`tp`.`customer_name` AS `customer_name`,`tp`.`task_track` AS `task_track`,`tp`.`task_subtrack` AS `task_subtrack`,`tp`.`task_value` AS `task_value`,`tp`.`task_ws` AS `task_ws`,`tp`.`task_deal_id` AS `task_deal_id`,`tp`.`task_status` AS `task_status`,`tp`.`task_status_name` AS `task_status_name` from (`task_priority` `tp` join `min_value_by_priority` `mv` on(`mv`.`task_customer_id` = `tp`.`task_customer_id` and `mv`.`task_track` = `tp`.`task_track` and `mv`.`task_deal_id` = `tp`.`task_deal_id` and `mv`.`best_priority_group` = `tp`.`priority_group` and `mv`.`min_task_value` = `tp`.`task_value`))), selected_tasks_dedup as (select `st`.`task_id` AS `task_id`,`st`.`task_customer_id` AS `task_customer_id`,`st`.`task_track` AS `task_track`,`st`.`task_subtrack` AS `task_subtrack`,`st`.`task_value` AS `task_value`,`st`.`task_ws` AS `task_ws`,`st`.`task_deal_id` AS `task_deal_id`,`st`.`task_status` AS `task_status`,`st`.`task_status_name` AS `task_status_name` from `selected_tasks` `st`), selected_tasks_agg as (select `std`.`task_customer_id` AS `task_customer_id`,`std`.`task_track` AS `task_track`,`std`.`task_deal_id` AS `task_deal_id`,group_concat(`std`.`task_subtrack` order by `std`.`task_id` ASC separator ', ') AS `potential_use_case`,min(`std`.`task_value`) AS `potential_value_usd`,group_concat(`std`.`task_ws` order by `std`.`task_id` ASC separator ', ') AS `potential_task_ws`,group_concat(`std`.`task_status_name` order by `std`.`task_id` ASC separator ', ') AS `potential_task_status` from `selected_tasks_dedup` `std` group by `std`.`task_customer_id`,`std`.`task_track`,`std`.`task_deal_id`)select `ctdb`.`customer_name` AS `customer_name`,`sta`.`task_deal_id` AS `task_deal_id`,`ctdb`.`task_track` AS `solution_track`,`hpc`.`has_project` AS `has_project`,`sta`.`potential_use_case` AS `potential_use_case`,`sta`.`potential_value_usd` AS `potential_value_usd`,`sta`.`potential_task_ws` AS `potential_task_ws`,`sta`.`potential_task_status` AS `potential_task_status` from ((`customer_track_deal_base` `ctdb` join `has_project_calc` `hpc` on(`hpc`.`task_customer_id` = `ctdb`.`task_customer_id` and `hpc`.`task_track` = `ctdb`.`task_track` and `hpc`.`task_deal_id` = `ctdb`.`task_deal_id`)) join `selected_tasks_agg` `sta` on(`sta`.`task_customer_id` = `ctdb`.`task_customer_id` and `sta`.`task_track` = `ctdb`.`task_track` and `sta`.`task_deal_id` = `ctdb`.`task_deal_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwCustomerCiscoLCITrackProjectPM`
--

/*!50001 DROP VIEW IF EXISTS `vwCustomerCiscoLCITrackProjectPM`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwCustomerCiscoLCITrackProjectPM` AS with task_base as (select `t`.`task_customer_id` AS `customer_id`,`t`.`task_track` AS `task_track` from `tbTask` `t` where `t`.`task_tasktype_id` in (21,22) and `t`.`task_status` in (1,3) and `t`.`task_customer_id` <> 0), task_track_agg as (select `tb`.`customer_id` AS `customer_id`,group_concat(distinct `tb`.`task_track` order by `tb`.`task_track` ASC separator ', ') AS `Track` from `task_base` `tb` group by `tb`.`customer_id`), project_base as (select `p`.`project_id` AS `project_id`,`p`.`project_customer_id` AS `customer_id` from `tbProject` `p` where `p`.`project_status` not in ('Canceled','Closed')), project_qty as (select `pb`.`customer_id` AS `customer_id`,count(0) AS `qty_project` from `project_base` `pb` group by `pb`.`customer_id`), pm_active_by_customer as (select `pb`.`customer_id` AS `customer_id`,group_concat(distinct `u`.`user_name` order by `u`.`user_name` ASC separator ', ') AS `pm_name` from ((`project_base` `pb` join `tbProjectTeam` `pt` on(`pt`.`projteam_project_id` = `pb`.`project_id` and `pt`.`projteam_department_id` = 11 and `pt`.`projteam_allocation_end` is null)) join `tbUser` `u` on(`u`.`user_id` = `pt`.`projteam_user_id`)) group by `pb`.`customer_id`), pm_inactive_ranked as (select `pb`.`customer_id` AS `customer_id`,`pt`.`projteam_user_id` AS `projteam_user_id`,`pt`.`projteam_allocation_start` AS `projteam_allocation_start`,`pt`.`projteam_allocation_end` AS `projteam_allocation_end`,row_number() over ( partition by `pb`.`customer_id` order by `pt`.`projteam_allocation_end` desc,coalesce(`pt`.`projteam_allocation_start`,cast('1000-01-01' as date)) desc,`pt`.`projteam_user_id` desc) AS `rn` from (`project_base` `pb` join `tbProjectTeam` `pt` on(`pt`.`projteam_project_id` = `pb`.`project_id` and `pt`.`projteam_department_id` = 11 and `pt`.`projteam_allocation_end` is not null))), pm_last_inactive_by_customer as (select `pir`.`customer_id` AS `customer_id`,`u`.`user_name` AS `pm_name` from (`pm_inactive_ranked` `pir` join `tbUser` `u` on(`u`.`user_id` = `pir`.`projteam_user_id`)) where `pir`.`rn` = 1)select `tta`.`customer_id` AS `customer_id`,`c`.`company_name` AS `customer_name`,`tta`.`Track` AS `Track`,coalesce(`pq`.`qty_project`,0) AS `qty_project`,coalesce(`pac`.`pm_name`,`plic`.`pm_name`) AS `pm_name` from ((((`task_track_agg` `tta` join `tbCompany` `c` on(`c`.`company_id` = `tta`.`customer_id`)) left join `project_qty` `pq` on(`pq`.`customer_id` = `tta`.`customer_id`)) left join `pm_active_by_customer` `pac` on(`pac`.`customer_id` = `tta`.`customer_id`)) left join `pm_last_inactive_by_customer` `plic` on(`plic`.`customer_id` = `tta`.`customer_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwFilterAssetContractEnd`
--

/*!50001 DROP VIEW IF EXISTS `vwFilterAssetContractEnd`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwFilterAssetContractEnd` AS select `c`.`customer_id` AS `customer_id`,`n`.`company_name` AS `customer_name`,`c`.`asset_id` AS `asset_id`,`c`.`subscription_id` AS `subscription_id`,`a`.`asset_product_id` AS `asset_product_id`,`p`.`product_name` AS `product_name`,`a`.`asset_serial_number` AS `asset_serial_number`,`a`.`asset_instance_number` AS `asset_instance_number`,`a`.`asset_parent_level` AS `major_minor` from ((((select `tbContractNTTAsset`.`nttasset_customer_id` AS `customer_id`,`tbContractNTTAsset`.`nttasset_asset_id` AS `asset_id`,`tbContractNTTAsset`.`nttasset_subscription_id` AS `subscription_id`,max(`tbContractNTTAsset`.`nttasset_contract_end`) AS `contract_end` from `tbContractNTTAsset` where `tbContractNTTAsset`.`nttasset_customer_id` > 0 group by `tbContractNTTAsset`.`nttasset_customer_id`,`tbContractNTTAsset`.`nttasset_asset_id`,`tbContractNTTAsset`.`nttasset_subscription_id` union select `tbContractVendorAsset`.`vendorasset_customer_id` AS `customer_id`,`tbContractVendorAsset`.`vendorasset_asset_id` AS `asset_id`,`tbContractVendorAsset`.`vendorasset_subscription_id` AS `subscription_id`,max(`tbContractVendorAsset`.`vendorasset_end`) AS `contract_end` from `tbContractVendorAsset` where `tbContractVendorAsset`.`vendorasset_customer_id` > 0 group by `tbContractVendorAsset`.`vendorasset_customer_id`,`tbContractVendorAsset`.`vendorasset_asset_id`,`tbContractVendorAsset`.`vendorasset_subscription_id`) `c` join `tbAsset` `a` on(`c`.`asset_id` = `a`.`asset_id`)) join `tbProduct` `p` on(`a`.`asset_product_id` = `p`.`product_id`)) join `tbCompany` `n` on(`c`.`customer_id` = `n`.`company_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwFilterCompanyFromContract`
--

/*!50001 DROP VIEW IF EXISTS `vwFilterCompanyFromContract`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwFilterCompanyFromContract` AS select `tb1`.`customer_id` AS `customer_id`,`tb2`.`company_name` AS `customer_name` from ((select `tbContractNTTAsset`.`nttasset_customer_id` AS `customer_id` from `tbContractNTTAsset` group by `tbContractNTTAsset`.`nttasset_customer_id` union select `tbContractVendorAsset`.`vendorasset_customer_id` AS `customer_id` from `tbContractVendorAsset` group by `tbContractVendorAsset`.`vendorasset_customer_id`) `tb1` join `tbCompany` `tb2` on(`tb1`.`customer_id` = `tb2`.`company_id`)) order by `tb2`.`company_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwFilterTask`
--

/*!50001 DROP VIEW IF EXISTS `vwFilterTask`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwFilterTask` AS select `t`.`task_id` AS `task_id`,`t`.`task_owner_id` AS `task_owner_id`,case when `t`.`task_owner_id` = 0 then 'UNASSIGNED' else `u`.`user_name` end AS `task_owner_name`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name`,`t`.`task_type_id` AS `task_type_id`,`ty`.`tasktype_name` AS `task_type_name`,`t`.`task_status_id` AS `task_status_id`,`st`.`statustype_name` AS `task_status_name`,`t`.`task_ws` AS `task_ws`,`t`.`task_deal_id` AS `task_deal_id`,`t`.`task_track` AS `task_track`,`t`.`task_start_performed` AS `task_start_performed`,`t`.`task_end_performed` AS `task_end_performed` from (((((select `tbTask`.`task_id` AS `task_id`,`tbTask`.`task_owner_id` AS `task_owner_id`,`tbTask`.`task_customer_id` AS `task_customer_id`,`tbTask`.`task_tasktype_id` AS `task_type_id`,`tbTask`.`task_status` AS `task_status_id`,`tbTask`.`task_ws` AS `task_ws`,`tbTask`.`task_deal_id` AS `task_deal_id`,`tbTask`.`task_track` AS `task_track`,`tbTask`.`task_start_performed` AS `task_start_performed`,`tbTask`.`task_end_performed` AS `task_end_performed` from `tbTask` union select `tbTask`.`task_id` AS `task_id`,`tbTask`.`task_temp_owner_id` AS `task_owner_id`,`tbTask`.`task_customer_id` AS `task_customer_id`,`tbTask`.`task_tasktype_id` AS `task_type_id`,`tbTask`.`task_status` AS `task_status_id`,`tbTask`.`task_ws` AS `task_ws`,`tbTask`.`task_deal_id` AS `task_deal_id`,`tbTask`.`task_track` AS `task_track`,`tbTask`.`task_start_performed` AS `task_start_performed`,`tbTask`.`task_end_performed` AS `task_end_performed` from `tbTask` where `tbTask`.`task_temp_owner_id` > 0) `t` left join `tbUser` `u` on(`t`.`task_owner_id` = `u`.`user_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbTaskType` `ty` on(`t`.`task_type_id` = `ty`.`tasktype_id`)) left join `tbStatusType` `st` on(`t`.`task_status_id` = `st`.`statustype_id`)) group by `t`.`task_id`,`t`.`task_owner_id`,`t`.`task_type_id`,`t`.`task_status_id`,`t`.`task_ws`,`t`.`task_deal_id`,`t`.`task_track`,`t`.`task_start_performed`,`t`.`task_end_performed` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwFilterTaskOwner`
--

/*!50001 DROP VIEW IF EXISTS `vwFilterTaskOwner`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwFilterTaskOwner` AS select `t`.`task_owner_id` AS `task_owner_id`,case when `t`.`task_owner_id` = 0 then 'NO CSM' else `u`.`user_name` end AS `task_owner_name` from ((select `tbTask`.`task_owner_id` AS `task_owner_id` from `tbTask` union select `tbTask`.`task_temp_owner_id` AS `task_owner_id` from `tbTask`) `t` left join `tbUser` `u` on(`t`.`task_owner_id` = `u`.`user_id`)) where `t`.`task_owner_id` is not null order by `u`.`user_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwForecast`
--

/*!50001 DROP VIEW IF EXISTS `vwForecast`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwForecast` AS select `t`.`task_id` AS `task_id`,`t`.`task_tasktype_id` AS `task_tasktype_id`,`tp`.`tasktype_name` AS `task_tasktype_name`,`t`.`task_owner_id` AS `task_owner_id`,`o`.`user_name` AS `task_owner_name`,`t`.`task_customer_id` AS `task_client_id`,`c`.`company_name` AS `task_client_name`,`t`.`task_status` AS `task_status_id`,`tst`.`statustype_name` AS `task_status_name`,`a`.`activity_status` AS `activity_status_id`,`ast`.`statustype_name` AS `activity_status_name`,`a`.`activity_value` AS `activity_value`,`a`.`activity_currency` AS `activity_currency`,`a`.`activity_end` AS `activity_end`,`a`.`activity_end_fy` AS `activity_end_fy`,`a`.`activity_approved` AS `activity_approved`,`a`.`activity_approved_value` AS `activity_approved_value`,`a`.`activity_approval_date` AS `activity_approval_date`,`a`.`activity_approval_fy` AS `activity_approval_fy` from ((((((`tbTask` `t` left join `tbTaskActivity` `a` on(`t`.`task_id` = `a`.`activity_task_id`)) left join `tbUser` `o` on(`t`.`task_owner_id` = `o`.`user_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) left join `tbStatusType` `tst` on(`t`.`task_status` = `tst`.`statustype_id`)) left join `tbStatusType` `ast` on(`a`.`activity_status` = `ast`.`statustype_id`)) where `t`.`task_eligible` = 'Y' and `a`.`activity_status` <> 4 and `a`.`activity_status` <> 5 and `a`.`activity_status` <> 6 and `a`.`activity_value` > 0 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwHeatmap`
--

/*!50001 DROP VIEW IF EXISTS `vwHeatmap`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwHeatmap` AS select `h`.`heatmap_id` AS `heatmap_id`,`h`.`heatmap_customer_id` AS `heatmap_customer_id`,`c`.`group_name` AS `heatmap_customer_name`,`h`.`heatmap_vendor_id` AS `heatmap_vendor_id`,`v`.`company_name` AS `heatmap_vendor_name`,`h`.`heatmap_sales_status` AS `heatmap_sales_status`,`h`.`heatmap_technology_domain` AS `heatmap_technology_domain`,`h`.`heatmap_competitor_present` AS `heatmap_competitor_present` from ((`tbHeatmap` `h` join `tbCompanyEconomicGroup` `c` on(`c`.`group_id` = `h`.`heatmap_customer_id`)) join `tbCompany` `v` on(`v`.`company_id` = `h`.`heatmap_vendor_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwIdleAsset`
--

/*!50001 DROP VIEW IF EXISTS `vwIdleAsset`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwIdleAsset` AS select `x`.`ClientId` AS `ClientId`,`x`.`Client` AS `Client`,`x`.`ClientSiteId` AS `ClientSiteId`,`x`.`ClientSite` AS `ClientSite`,`x`.`ClientSiteCity` AS `ClientSiteCity`,`x`.`ClientSiteUF` AS `ClientSiteUF`,`x`.`AssetId` AS `AssetId`,`x`.`ProductId` AS `ProductId`,`x`.`PartNumber` AS `PartNumber`,`x`.`Description` AS `Description`,`x`.`SerialNumber` AS `SerialNumber`,`x`.`UnitValue` AS `UnitValue`,`x`.`DeliveryDate` AS `DeliveryDate`,`x`.`DaysOfIdleness` AS `DaysOfIdleness`,`x`.`LoS` AS `LoS`,`x`.`rn` AS `rn`,`x`.`tracking_operation` AS `tracking_operation` from (select `c`.`company_id` AS `ClientId`,`c`.`company_name` AS `Client`,`s`.`site_id` AS `ClientSiteId`,`s`.`site_name` AS `ClientSite`,`s`.`site_city` AS `ClientSiteCity`,`s`.`site_uf` AS `ClientSiteUF`,`a`.`asset_id` AS `AssetId`,`p`.`product_id` AS `ProductId`,`p`.`product_name` AS `PartNumber`,`p`.`product_description` AS `Description`,`a`.`asset_serial_number` AS `SerialNumber`,`a`.`asset_price` AS `UnitValue`,`t`.`tracking_operation_date` AS `DeliveryDate`,to_days(curdate()) - to_days(`t`.`tracking_operation_date`) AS `DaysOfIdleness`,`p`.`product_endofsupport` AS `LoS`,row_number() over ( partition by `t`.`tracking_asset_id` order by `t`.`tracking_id` desc) AS `rn`,`t`.`tracking_operation` AS `tracking_operation` from ((((`tbAssetTracking` `t` left join `tbAsset` `a` on(`t`.`tracking_asset_id` = `a`.`asset_id`)) left join `tbCompany` `c` on(`t`.`tracking_company_id` = `c`.`company_id`)) left join `tbCompanySite` `s` on(`t`.`tracking_site_id` = `s`.`site_id`)) left join `tbProduct` `p` on(`a`.`asset_product_id` = `p`.`product_id`))) `x` where `x`.`rn` = 1 and `x`.`tracking_operation` = 'DELIVERED' and `x`.`DeliveryDate` < curdate() - interval 90 day */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwKPICiscoSVIEngagementTotalEligible`
--

/*!50001 DROP VIEW IF EXISTS `vwKPICiscoSVIEngagementTotalEligible`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwKPICiscoSVIEngagementTotalEligible` AS with recursive months_list as (select '2024-01-01' AS `month_date` union all select `months_list`.`month_date` + interval 1 month AS `DATE_ADD(month_date, INTERVAL 1 MONTH)` from `months_list` where `months_list`.`month_date` < curdate())select month(`vt1`.`month_date`) AS `month`,year(`vt1`.`month_date`) AS `year`,sum(`vt2`.`task_value`) AS `total_eligible` from (`months_list` `vt1` join `tbTask` `vt2` on(`vt2`.`task_start` >= `vt1`.`month_date` - interval 18 month and `vt2`.`task_start` < `vt1`.`month_date`)) where `vt2`.`task_tasktype_id` = 22 and `vt2`.`task_eligible` = 'Y' group by `vt1`.`month_date` order by `vt1`.`month_date` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwKPICiscoSVIEngagementTotalOnboard`
--

/*!50001 DROP VIEW IF EXISTS `vwKPICiscoSVIEngagementTotalOnboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwKPICiscoSVIEngagementTotalOnboard` AS with recursive months_list as (select '2024-01-01' AS `month_date` union all select `months_list`.`month_date` + interval 1 month AS `DATE_ADD(month_date, INTERVAL 1 MONTH)` from `months_list` where `months_list`.`month_date` < curdate())select month(`vt1`.`month_date`) AS `month`,year(`vt1`.`month_date`) AS `year`,`vt3`.`activity_name` AS `stage`,sum(`vt2`.`task_value`) AS `total_onboard`,`vt4`.`total_eligible` AS `total_eligible`,sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 AS `nvi`,case when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 10 then 0 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 15 then 1 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 20 then 2 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 25 then 3 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 30 then 4 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 35 then 5 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 40 then 6 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 45 then 7 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 50 then 8 when sum(`vt2`.`task_value`) / `vt4`.`total_eligible` * 100 <= 55 then 9 else 10 end AS `pvi` from (((`months_list` `vt1` join `tbTask` `vt2` on(`vt2`.`task_start` >= `vt1`.`month_date` - interval 18 month and `vt2`.`task_start` < `vt1`.`month_date`)) join `tbTaskActivity` `vt3` on(`vt2`.`task_id` = `vt3`.`activity_task_id`)) join `vwKPICiscoSVIEngagementTotalEligible` `vt4` on(month(`vt1`.`month_date`) = `vt4`.`month` and year(`vt1`.`month_date`) = `vt4`.`year`)) where `vt2`.`task_tasktype_id` = 22 and `vt2`.`task_eligible` = 'Y' and `vt3`.`activity_name` = 'Onboard' and `vt3`.`activity_status` > 8 group by `vt1`.`month_date`,`vt3`.`activity_name` order by `vt1`.`month_date`,`vt3`.`activity_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwMeasureTeamGoal`
--

/*!50001 DROP VIEW IF EXISTS `vwMeasureTeamGoal`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwMeasureTeamGoal` AS select `tg`.`goal_id` AS `goal_id`,`tg`.`goal_tasks_list` AS `goal_tasks_list`,`tg`.`goal_users_list` AS `goal_users_list`,`tg`.`goal_fy` AS `goal_fy`,`tg`.`goal_team_id` AS `goal_team_id`,`tg`.`goal_measurement_by_counting` AS `goal_measurement_by_counting`,`tg`.`goal_measurement_by_sum` AS `goal_measurement_by_sum`,`tg`.`goal_value` AS `goal_value`,`tg`.`goal_point` AS `goal_point`,`tg`.`goal_multiplier` AS `goal_multiplier`,`tg`.`goal_individual` AS `goal_individual`,`ta`.`task_owner_id` AS `task_owner_id`,`ta`.`task_owner_name` AS `task_owner_name`,`ta`.`task_tasktype_id` AS `task_tasktype_id`,`ta`.`activity_approved_value` AS `activity_approved_value`,`ta`.`activity_approval_fy` AS `activity_approval_fy`,case when find_in_set(`ta`.`task_tasktype_id`,`tg`.`goal_tasks_list`) > 0 and find_in_set(`ta`.`task_owner_id`,`tg`.`goal_users_list`) > 0 then 'Match na Lista' when `ta`.`task_id` is not null then 'Não Match na Lista (Erro Lógico?)' else 'Sem Tarefa Aprovada' end AS `task_list_match_status` from (`tbTeamGoal` `tg` left join (select `t`.`task_id` AS `task_id`,`t`.`task_owner_id` AS `task_owner_id`,`u`.`user_name` AS `task_owner_name`,`t`.`task_tasktype_id` AS `task_tasktype_id`,`a`.`activity_approved_value` AS `activity_approved_value`,`a`.`activity_approval_fy` AS `activity_approval_fy` from ((`tbTask` `t` left join `tbTaskActivity` `a` on(`t`.`task_id` = `a`.`activity_task_id`)) join `tbUser` `u` on(`t`.`task_owner_id` = `u`.`user_id`)) where `t`.`task_eligible` = 'Y' and `a`.`activity_approved` <> 0) `ta` on(`tg`.`goal_fy` = `ta`.`activity_approval_fy` and find_in_set(`ta`.`task_tasktype_id`,`tg`.`goal_tasks_list`) > 0 and find_in_set(`ta`.`task_owner_id`,`tg`.`goal_users_list`) > 0)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwMeasureTeamTarget`
--

/*!50001 DROP VIEW IF EXISTS `vwMeasureTeamTarget`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwMeasureTeamTarget` AS select `tt`.`target_id` AS `target_id`,`tt`.`target_tasks_list` AS `target_tasks_list`,`tt`.`target_users_list` AS `target_users_list`,`tt`.`target_fy` AS `target_fy`,`tt`.`target_team_id` AS `target_team_id`,`tt`.`target_measurement_by_counting` AS `target_measurement_by_counting`,`tt`.`target_measurement_by_sum` AS `target_measurement_by_sum`,`tt`.`target_value` AS `target_value`,`tt`.`target_point` AS `target_point`,`tt`.`target_multiplier` AS `target_multiplier`,`tt`.`target_individual` AS `target_individual`,`ta`.`task_owner_id` AS `task_owner_id`,`ta`.`task_owner_name` AS `task_owner_name`,`ta`.`task_tasktype_id` AS `task_tasktype_id`,`ta`.`activity_approved_value` AS `activity_approved_value`,`ta`.`activity_approval_fy` AS `activity_approval_fy`,case when find_in_set(`ta`.`task_tasktype_id`,`tt`.`target_tasks_list`) > 0 and find_in_set(`ta`.`task_owner_id`,`tt`.`target_users_list`) > 0 then 'Match na Lista' when `ta`.`task_id` is not null then 'Não Match na Lista (Erro Lógico?)' else 'Sem Tarefa Aprovada' end AS `task_list_match_status` from (`tbTeamTarget` `tt` left join (select `t`.`task_id` AS `task_id`,`t`.`task_owner_id` AS `task_owner_id`,`u`.`user_name` AS `task_owner_name`,`t`.`task_tasktype_id` AS `task_tasktype_id`,`a`.`activity_approved_value` AS `activity_approved_value`,`a`.`activity_approval_fy` AS `activity_approval_fy` from ((`tbTask` `t` left join `tbTaskActivity` `a` on(`t`.`task_id` = `a`.`activity_task_id`)) join `tbUser` `u` on(`t`.`task_owner_id` = `u`.`user_id`)) where `t`.`task_eligible` = 'Y' and `a`.`activity_approved` <> 0) `ta` on(`tt`.`target_fy` = `ta`.`activity_approval_fy` and find_in_set(`ta`.`task_tasktype_id`,`tt`.`target_tasks_list`) > 0 and find_in_set(`ta`.`task_owner_id`,`tt`.`target_users_list`) > 0)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwOpportunity12m`
--

/*!50001 DROP VIEW IF EXISTS `vwOpportunity12m`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwOpportunity12m` AS select `t`.`opportunity_customer_id` AS `opportunity_customer_id`,`c`.`company_name` AS `opportunity_customer_name`,coalesce(sum(`t`.`amount_brl`),0) AS `opportunity_amount_total_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Deal Lost' then `t`.`amount_brl` end),0) AS `opportunity_amount_deal_lost_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Identification' then `t`.`amount_brl` end),0) AS `opportunity_amount_identification_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Finalist' then `t`.`amount_brl` end),0) AS `opportunity_amount_finalist_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Proposal Evaluation' then `t`.`amount_brl` end),0) AS `opportunity_amount_proposal_evaluation_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Deal Won' then `t`.`amount_brl` end),0) AS `opportunity_amount_deal_won_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Proposal' then `t`.`amount_brl` end),0) AS `opportunity_amount_proposal_12m`,coalesce(sum(case when `t`.`opportunity_stage` = 'Qualification' then `t`.`amount_brl` end),0) AS `opportunity_amount_qualification_12m`,coalesce(sum(case when `t`.`opportunity_stage` in ('Requirements Definition','Requirements Definit') then `t`.`amount_brl` end),0) AS `opportunity_amount_requirements_definition_12m` from ((select `o`.`opportunity_num` AS `opportunity_num`,`o`.`opportunity_customer_id` AS `opportunity_customer_id`,`o`.`opportunity_stage` AS `opportunity_stage`,case when month(`o`.`opportunity_close_date`) >= 4 then year(`o`.`opportunity_close_date`) else year(`o`.`opportunity_close_date`) - 1 end AS `fiscal_year`,sum(case when `o`.`opportunity_currency` = 'USD' then `o`.`opportunity_amount` * coalesce(`r`.`rate_value`,0) else `o`.`opportunity_amount` end) AS `amount_brl` from (`tbOpportunity` `o` left join `tbCurrencyRate` `r` on(`r`.`rate_currency` = 'USD' and `r`.`rate_fiscalyear` = case when month(`o`.`opportunity_close_date`) >= 4 then year(`o`.`opportunity_close_date`) else year(`o`.`opportunity_close_date`) - 1 end)) where `o`.`opportunity_close_date` >= curdate() - interval 12 month and `o`.`opportunity_create_date` <= curdate() group by `o`.`opportunity_num`,`o`.`opportunity_customer_id`,`o`.`opportunity_stage`) `t` join `tbCompany` `c` on(`t`.`opportunity_customer_id` = `c`.`company_id`)) group by `t`.`opportunity_customer_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwProduct`
--

/*!50001 DROP VIEW IF EXISTS `vwProduct`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwProduct` AS select `tbProduct`.`product_id` AS `product_id`,`tbProduct`.`product_manufacturer_id` AS `product_manufacturer_id`,`tbProduct`.`product_manufacturer_name` AS `product_manufacturer_name`,`tbProduct`.`product_vendor_id` AS `product_vendor_id`,`tbProduct`.`product_name` AS `product_name`,`tbProduct`.`product_family` AS `product_family`,`tbProduct`.`product_subfamily` AS `product_subfamily`,`tbProduct`.`product_group` AS `product_group`,`tbProduct`.`product_subtype` AS `product_subtype`,`tbProduct`.`product_type` AS `product_type`,`tbProduct`.`product_business_entity` AS `product_business_entity`,`tbProduct`.`product_subbusiness_entity` AS `product_subbusiness_entity`,`tbProduct`.`product_description` AS `product_description`,`tbProduct`.`product_endofsupport` AS `product_endofsupport`,`tbProduct`.`product_endofsoftwaremaintenance` AS `product_endofsoftwaremaintenance`,`tbProduct`.`product_endofsale` AS `product_endofsale`,`tbProduct`.`product_bulletin` AS `product_bulletin`,`tbProduct`.`product_pid_mapping_group` AS `product_pid_mapping_group`,`tbProduct`.`product_remark` AS `product_remark`,`tbCompany`.`company_name` AS `product_vendor_name` from (`tbProduct` left join `tbCompany` on(`tbProduct`.`product_vendor_id` = `tbCompany`.`company_id`)) where `tbProduct`.`product_name`  not like 'VAGO %' order by `tbCompany`.`company_name`,`tbProduct`.`product_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwProject`
--

/*!50001 DROP VIEW IF EXISTS `vwProject`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwProject` AS select `p`.`project_id` AS `project_id`,`p`.`project_ov` AS `project_ov`,`p`.`project_owner` AS `project_owner`,`p`.`project_customer_id` AS `project_customer_id`,`c`.`company_name` AS `project_customer_name`,`p`.`project_name` AS `project_name`,case when `p`.`project_ov` is not null then concat('(OV ',`p`.`project_ov`,') ',`p`.`project_name`) else `p`.`project_name` end AS `project_ov_name`,`p`.`project_internalization_date` AS `project_internalization_date`,`p`.`project_start_date` AS `project_start_date`,`p`.`project_end_date` AS `project_end_date`,`p`.`project_status` AS `project_status`,`p`.`project_description` AS `project_description`,`p`.`project_scope` AS `project_scope`,`p`.`project_objectives` AS `project_objectives`,`p`.`project_current_scenario` AS `project_current_scenario`,`p`.`project_key_feature_products` AS `project_key_feature_products`,`p`.`project_justification` AS `project_justification`,`p`.`project_remark` AS `project_remark`,`p`.`project_methodology` AS `project_methodology`,`p`.`project_action` AS `project_action`,`p`.`project_sprint_timebox` AS `project_sprint_timebox`,`p`.`project_currency` AS `project_currency`,`p`.`project_total_amount` AS `project_total_amount`,`p`.`project_total_amount_brl` AS `project_total_amount_brl`,`p`.`project_planned_cost_subcontract_brl` AS `project_planned_cost_subcontract_brl`,`p`.`project_planned_cost_subcontract_po_brl` AS `project_planned_cost_subcontract_po_brl`,`p`.`project_planned_cost_pct_brl` AS `project_planned_cost_pct_brl`,`p`.`project_planned_cost_brl` AS `project_planned_cost_brl`,`p`.`project_cost_final_value_brl` AS `project_cost_final_value_brl` from (`tbProject` `p` join `tbCompany` `c` on(`p`.`project_customer_id` = `c`.`company_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwProjectTeam`
--

/*!50001 DROP VIEW IF EXISTS `vwProjectTeam`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwProjectTeam` AS select `pt`.`projteam_id` AS `projteam_id`,`pt`.`projteam_project_id` AS `projteam_project_id`,`p`.`project_name` AS `projteam_project_name`,`p`.`project_ov` AS `projteam_project_ov`,`p`.`project_customer_id` AS `projteam_project_customer_id`,`c`.`company_name` AS `projteam_project_customer_name`,`p`.`project_status` AS `projteam_project_status`,`pt`.`projteam_user_id` AS `projteam_member_id`,`u`.`user_name` AS `projteam_member_name`,`pt`.`projteam_department_id` AS `projteam_department_id`,`d`.`department_name` AS `projteam_department_name`,`pt`.`projteam_level_id` AS `projteam_level_id`,`r`.`level_name` AS `projteam_level_name`,`pt`.`projteam_technical_lead` AS `projteam_technical_lead`,`pt`.`projteam_working_time` AS `projteam_working_time`,`pt`.`projteam_allocation_start` AS `projteam_allocation_start`,`pt`.`projteam_allocation_end` AS `projteam_allocation_end` from (((((`tbProjectTeam` `pt` join `tbProject` `p` on(`pt`.`projteam_project_id` = `p`.`project_id`)) join `tbUser` `u` on(`pt`.`projteam_user_id` = `u`.`user_id`)) join `tbCompany` `c` on(`p`.`project_customer_id` = `c`.`company_id`)) left join `tbDepartment` `d` on(`pt`.`projteam_department_id` = `d`.`department_id`)) left join `tbResourceLevel` `r` on(`pt`.`projteam_level_id` = `r`.`level_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwSquad`
--

/*!50001 DROP VIEW IF EXISTS `vwSquad`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwSquad` AS select `s`.`squad_id` AS `squad_id`,`s`.`squad_user_id` AS `squad_user_id`,`u`.`user_name` AS `squad_user_name`,`s`.`squad_department_id` AS `squad_department_id`,`d`.`department_name` AS `squad_department_name`,`d`.`department_area` AS `squad_department_area`,`s`.`squad_level_id` AS `squad_level_id`,`rl`.`level_name` AS `squad_level_name`,`rl`.`level_ratecard` AS `squad_level_ratecard` from (((`tbSquad` `s` join `tbUser` `u` on(`s`.`squad_user_id` = `u`.`user_id`)) join `tbDepartment` `d` on(`s`.`squad_department_id` = `d`.`department_id`)) join `tbResourceLevel` `rl` on(`s`.`squad_level_id` = `rl`.`level_id`)) where (`s`.`squad_user_id`,`s`.`squad_upgrade`) in (select `tbSquad`.`squad_user_id`,max(`tbSquad`.`squad_upgrade`) from `tbSquad` group by `tbSquad`.`squad_user_id`) order by `u`.`user_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwSquadCSM`
--

/*!50001 DROP VIEW IF EXISTS `vwSquadCSM`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwSquadCSM` AS select `s`.`squad_user_id` AS `csm_id`,`u`.`user_name` AS `csm_name`,`s`.`squad_level_id` AS `csm_level_id`,`rl`.`level_name` AS `csm_level_name` from ((`tbSquad` `s` join `tbUser` `u` on(`s`.`squad_user_id` = `u`.`user_id`)) join `tbResourceLevel` `rl` on(`s`.`squad_level_id` = `rl`.`level_id`)) where (`s`.`squad_user_id`,`s`.`squad_upgrade`) in (select `sq`.`squad_user_id`,max(`sq`.`squad_upgrade`) from `tbSquad` `sq` group by `sq`.`squad_user_id`) and `s`.`squad_department_id` = 30 group by `u`.`user_name` order by `u`.`user_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwSquadCSMActive`
--

/*!50001 DROP VIEW IF EXISTS `vwSquadCSMActive`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwSquadCSMActive` AS select `s`.`squad_user_id` AS `csm_id`,`u`.`user_name` AS `csm_name`,`s`.`squad_level_id` AS `csm_level_id`,`rl`.`level_name` AS `csm_level_name` from ((`tbSquad` `s` join `tbUser` `u` on(`s`.`squad_user_id` = `u`.`user_id` and `u`.`user_termination` is null)) join `tbResourceLevel` `rl` on(`s`.`squad_level_id` = `rl`.`level_id`)) where (`s`.`squad_user_id`,`s`.`squad_upgrade`) in (select `sq`.`squad_user_id`,max(`sq`.`squad_upgrade`) from `tbSquad` `sq` group by `sq`.`squad_user_id`) and `s`.`squad_department_id` = 30 group by `u`.`user_name` order by `u`.`user_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTESTE`
--

/*!50001 DROP VIEW IF EXISTS `vwTESTE`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTESTE` AS select `tbTask`.`task_owner_id` AS `task_owner_id`,`tbTask`.`task_customer_id` AS `task_customer_id`,`tbTask`.`task_id` AS `task_id`,`tbTaskActivity`.`activity_id` AS `activity_id`,`tbTaskActivity`.`activity_name` AS `activity_name`,`tbTaskActivity`.`activity_approved_value` AS `activity_approved_value`,`tbTaskActivity`.`activity_approval_date` AS `activity_approval_date`,if(month(`tbTaskActivity`.`activity_approval_date`) < 4,year(`tbTaskActivity`.`activity_approval_date`) - 1,year(`tbTaskActivity`.`activity_approval_date`)) AS `FY` from (`tbTask` join `tbTaskActivity` on(`tbTask`.`task_id` = `tbTaskActivity`.`activity_task_id`)) where (`tbTaskActivity`.`activity_status` = 9 or `tbTaskActivity`.`activity_status` = 10) and (`tbTask`.`task_tasktype_id` = 21 or `tbTask`.`task_tasktype_id` = 22) and `tbTaskActivity`.`activity_value` > 0 and `tbTaskActivity`.`activity_approved` <> 0 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTask`
--

/*!50001 DROP VIEW IF EXISTS `vwTask`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTask` AS select `t`.`task_id` AS `task_id`,`t`.`task_tasktype_id` AS `task_type_id`,`tp`.`tasktype_name` AS `task_type_name`,`t`.`task_reference` AS `task_reference`,`t`.`task_owner_id` AS `task_owner_id`,`o`.`user_name` AS `task_owner_name`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`to`.`user_name` AS `task_temp_owner_name`,`t`.`task_cr_party_id` AS `task_cr_party_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name`,`t`.`task_created_in` AS `task_created_in`,`t`.`task_created_by` AS `task_created_by_id`,case when `t`.`task_created_by` = 0 then 'System BA' else `tc`.`user_name` end AS `task_created_by_name`,`t`.`task_priority` AS `task_priority`,`t`.`task_project_id` AS `task_project_id`,concat('(OV: ',`p`.`project_ov`,') ',`p`.`project_name`) AS `task_project_name`,`t`.`task_status` AS `task_status_id`,`st`.`statustype_name` AS `task_status_name`,`t`.`task_status_justification` AS `task_status_justification`,`t`.`task_start` AS `task_start`,`t`.`task_end` AS `task_end`,`t`.`task_start_performed` AS `task_start_performed`,`t`.`task_end_performed` AS `task_end_performed`,`t`.`task_end_fy` AS `task_end_fy`,`t`.`task_booking_date` AS `task_booking_date`,`t`.`task_booking_amount` AS `task_booking_amount`,`t`.`task_deal_id` AS `task_deal_id`,`t`.`task_ws` AS `task_ws`,`t`.`task_completed` AS `task_completed`,`t`.`task_architecture` AS `task_architecture`,`t`.`task_solution_domain` AS `task_solution_domain`,`t`.`task_track` AS `task_track`,`t`.`task_subtrack` AS `task_subtrack`,`t`.`task_eligible` AS `task_eligible`,`t`.`task_value` AS `task_value`,`t`.`task_forecast` AS `task_forecast`,`t`.`task_backlog` AS `task_backlog`,`t`.`task_rate` AS `task_rate`,`t`.`task_currency` AS `task_currency`,`t`.`task_description` AS `task_description`,`t`.`task_remark` AS `task_remark`,`t`.`task_ea_flag` AS `task_ea_flag`,`t`.`task_opt_in_flag` AS `task_opt_in_flag`,`spi`.`spi_lifecycle_stage` AS `spi_lifecycle_stage`,`spi`.`spi_last_checked_date` AS `spi_last_checked_date`,`t`.`task_telemetry_flag` AS `task_telemetry_flag`,`spi`.`spi_telemetry_type` AS `spi_telemetry_type` from ((((((((`tbTask` `t` left join `tbUser` `tc` on(`t`.`task_created_by` = `tc`.`user_id`)) left join `tbUser` `o` on(`t`.`task_owner_id` = `o`.`user_id`)) left join `tbUser` `to` on(`t`.`task_temp_owner_id` = `to`.`user_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) left join `tbStatusType` `st` on(`t`.`task_status` = `st`.`statustype_id`)) left join `tbProject` `p` on(`t`.`task_project_id` = `p`.`project_id`)) left join `tbCiscoSPI` `spi` on(`t`.`task_customer_id` = `spi`.`spi_customer_id` and `t`.`task_subtrack` = `spi`.`spi_use_case`)) order by `t`.`task_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskActivity`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskActivity`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskActivity` AS select `a`.`activity_id` AS `activity_id`,`a`.`activity_task_id` AS `activity_task_id`,`a`.`activity_seq` AS `activity_seq`,`a`.`activity_name` AS `activity_name`,`a`.`activity_objective` AS `activity_objective`,`a`.`activity_scope` AS `activity_scope`,`a`.`activity_expected_results` AS `activity_expected_results`,`a`.`activity_effort` AS `activity_effort`,`a`.`activity_status` AS `activity_status_id`,`st`.`statustype_name` AS `activity_status_name`,`a`.`activity_ws` AS `activity_ws`,`a`.`activity_deal_id` AS `activity_deal_id`,`a`.`activity_track` AS `activity_track`,`a`.`activity_sub_track` AS `activity_sub_track`,`a`.`activity_value` AS `activity_value`,`a`.`activity_currency` AS `activity_currency`,`a`.`activity_start` AS `activity_start`,`a`.`activity_end` AS `activity_end`,`a`.`activity_start_performed` AS `activity_start_performed`,`a`.`activity_end_performed` AS `activity_end_performed`,`a`.`activity_effort_performed` AS `activity_effort_performed`,`a`.`activity_completed` AS `activity_completed`,`a`.`activity_approved` AS `activity_approved`,`a`.`activity_approved_value` AS `activity_approved_value`,`a`.`activity_approved_currency` AS `activity_approved_currency`,`a`.`activity_approval_date` AS `activity_approval_date`,`a`.`activity_approval_request_date` AS `activity_approval_request_date`,`a`.`activity_approval_fy` AS `activity_approval_fy`,`a`.`activity_end_fy` AS `activity_end_fy`,`a`.`activity_backlog_value` AS `activity_backlog_value`,`ty`.`tasktype_name` AS `task_type_name`,`t`.`task_customer_id` AS `task_client_id`,`c`.`company_name` AS `task_client_name`,`t`.`task_owner_id` AS `task_owner_id`,`o`.`user_name` AS `task_owner_name`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`ot`.`user_name` AS `task_temp_owner_name`,`t`.`task_status` AS `task_status_id`,max(`r`.`taskrecord_next_followup`) AS `max_next_followup` from (((((((`tbTaskActivity` `a` left join `tbTask` `t` on(`a`.`activity_task_id` = `t`.`task_id`)) left join `tbTaskType` `ty` on(`t`.`task_tasktype_id` = `ty`.`tasktype_id`)) join `tbStatusType` `st` on(`a`.`activity_status` = `st`.`statustype_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbUser` `o` on(`t`.`task_owner_id` = `o`.`user_id`)) left join `tbUser` `ot` on(`t`.`task_temp_owner_id` = `ot`.`user_id`)) left join `tbTaskRecord` `r` on(`a`.`activity_id` = `r`.`taskrecord_activity_id`)) group by `a`.`activity_id`,`a`.`activity_task_id`,`a`.`activity_seq`,`a`.`activity_name`,`a`.`activity_objective`,`a`.`activity_scope`,`a`.`activity_expected_results`,`a`.`activity_effort`,`a`.`activity_status`,`st`.`statustype_name`,`a`.`activity_ws`,`a`.`activity_deal_id`,`a`.`activity_track`,`a`.`activity_sub_track`,`a`.`activity_value`,`a`.`activity_currency`,`a`.`activity_start`,`a`.`activity_end`,`a`.`activity_start_performed`,`a`.`activity_end_performed`,`a`.`activity_completed`,`a`.`activity_approved`,`a`.`activity_approved_value`,`a`.`activity_approval_date`,`a`.`activity_approval_request_date`,`a`.`activity_approval_fy`,`a`.`activity_end_fy`,`a`.`activity_backlog_value`,`ty`.`tasktype_name`,`t`.`task_customer_id`,`c`.`company_name`,`t`.`task_owner_id`,`o`.`user_name`,`t`.`task_temp_owner_id`,`ot`.`user_name`,`t`.`task_status` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskActivityDashboard`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskActivityDashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskActivityDashboard` AS select `a`.`activity_id` AS `activity_id`,`a`.`activity_task_id` AS `activity_task_id`,`a`.`activity_seq` AS `activity_seq`,`a`.`activity_name` AS `activity_name`,`a`.`activity_objective` AS `activity_objective`,`a`.`activity_scope` AS `activity_scope`,`a`.`activity_expected_results` AS `activity_expected_results`,`a`.`activity_effort` AS `activity_effort`,`a`.`activity_effort_performed` AS `activity_effort_performed`,`a`.`activity_status` AS `activity_status_id`,`ast`.`statustype_name` AS `activity_status_name`,`a`.`activity_start` AS `activity_start`,`a`.`activity_end` AS `activity_end`,`a`.`activity_start_performed` AS `activity_start_performed`,`a`.`activity_end_performed` AS `activity_end_performed`,`a`.`activity_value` AS `activity_value`,`a`.`activity_currency` AS `activity_currency`,`a`.`activity_completed` AS `activity_completed`,`a`.`activity_approved` AS `activity_approved`,`a`.`activity_approved_value` AS `activity_approved_value`,`a`.`activity_approved_currency` AS `activity_approved_currency`,`a`.`activity_approval_date` AS `activity_approval_date`,`a`.`activity_approval_request_date` AS `activity_approval_request_date`,`a`.`activity_approval_fy` AS `activity_approval_fy`,`a`.`activity_end_fy` AS `activity_end_fy`,`a`.`activity_backlog_value` AS `activity_backlog_value`,`a`.`activity_ws` AS `activity_ws`,`a`.`activity_deal_id` AS `activity_deal_id`,`a`.`activity_track` AS `activity_track`,`a`.`activity_sub_track` AS `activity_sub_track`,`t`.`task_tasktype_id` AS `task_type_id`,`tp`.`tasktype_name` AS `task_type_name`,`tp`.`tasktype_critical_level` AS `critical_level`,`tp`.`tasktype_critical_reason` AS `critical_reason`,`tp`.`tasktype_for_team` AS `task_for_team`,`t`.`task_priority` AS `task_priority`,`t`.`task_status` AS `task_status_id`,`tst`.`statustype_name` AS `task_status_name`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name`,`t`.`task_owner_id` AS `task_owner_id`,`o`.`user_name` AS `task_owner_name`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`ot`.`user_name` AS `task_temp_owner_name`,`t`.`task_ws` AS `task_ws`,`t`.`task_track` AS `task_track`,`t`.`task_subtrack` AS `task_subtrack`,`t`.`task_deal_id` AS `task_deal_id`,`fra`.`next_followup_activity_upcoming` AS `next_followup_activity_upcoming`,`fra`.`next_followup_activity_last` AS `next_followup_activity_last`,coalesce(`fra`.`next_followup_activity_upcoming`,`fra`.`next_followup_activity_last`) AS `next_followup_activity_effective`,case when `a`.`activity_end_performed` is not null then 1 else 0 end AS `is_activity_completed`,case when `a`.`activity_end` is not null and `a`.`activity_end` < curdate() and `a`.`activity_end_performed` is null then 1 else 0 end AS `is_activity_plan_overdue`,case when `a`.`activity_end` is not null and `a`.`activity_end` < curdate() and `a`.`activity_end_performed` is null then to_days(curdate()) - to_days(`a`.`activity_end`) else 0 end AS `days_activity_plan_overdue`,case when coalesce(`fra`.`next_followup_activity_upcoming`,`fra`.`next_followup_activity_last`) is null then 1 else 0 end AS `followup_activity_is_missing`,case when coalesce(`fra`.`next_followup_activity_upcoming`,`fra`.`next_followup_activity_last`) = curdate() then 1 else 0 end AS `followup_activity_is_today`,case when coalesce(`fra`.`next_followup_activity_upcoming`,`fra`.`next_followup_activity_last`) < curdate() then 1 else 0 end AS `followup_activity_is_overdue` from ((((((((`tbTaskActivity` `a` left join `tbStatusType` `ast` on(`a`.`activity_status` = `ast`.`statustype_id`)) left join `tbTask` `t` on(`a`.`activity_task_id` = `t`.`task_id`)) left join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbUser` `o` on(`t`.`task_owner_id` = `o`.`user_id`)) left join `tbUser` `ot` on(`t`.`task_temp_owner_id` = `ot`.`user_id`)) left join `tbStatusType` `tst` on(`t`.`task_status` = `tst`.`statustype_id`)) left join (select `r`.`taskrecord_activity_id` AS `activity_id`,min(case when `r`.`taskrecord_next_followup` >= curdate() then `r`.`taskrecord_next_followup` end) AS `next_followup_activity_upcoming`,max(`r`.`taskrecord_next_followup`) AS `next_followup_activity_last` from `tbTaskRecord` `r` where `r`.`taskrecord_activity_id` <> 0 and `r`.`taskrecord_next_followup` is not null group by `r`.`taskrecord_activity_id`) `fra` on(`fra`.`activity_id` = `a`.`activity_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskCustomer`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskCustomer`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskCustomer` AS select `t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name` from (`tbTask` `t` left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) group by `t`.`task_customer_id`,`c`.`company_name` order by `c`.`company_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskDashboard`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskDashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskDashboard` AS select `t`.`task_id` AS `task_id`,`t`.`task_tasktype_id` AS `task_type_id`,`tp`.`tasktype_name` AS `task_type_name`,`tp`.`tasktype_for_team` AS `task_for_team`,`tp`.`tasktype_finance_type` AS `task_finance_type`,`tp`.`tasktype_critical_level` AS `critical_level`,`tp`.`tasktype_critical_reason` AS `critical_reason`,`tp`.`tasktype_is_service_impacting` AS `is_service_impacting`,`t`.`task_reference` AS `task_reference`,`t`.`task_owner_id` AS `task_owner_id`,`o`.`user_name` AS `task_owner_name`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`ot`.`user_name` AS `task_temp_owner_name`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name`,`t`.`task_priority` AS `task_priority`,`t`.`task_status` AS `task_status_id`,`st`.`statustype_name` AS `task_status_name`,`t`.`task_status_justification` AS `task_status_justification`,`t`.`task_start` AS `task_start`,`t`.`task_end` AS `task_end`,`t`.`task_start_performed` AS `task_start_performed`,`t`.`task_end_performed` AS `task_end_performed`,`t`.`task_deal_id` AS `task_deal_id`,`t`.`task_ws` AS `task_ws`,`t`.`task_track` AS `task_track`,`t`.`task_subtrack` AS `task_subtrack`,`t`.`task_project_id` AS `task_project_id`,concat('(OV: ',`p`.`project_ov`,') ',`p`.`project_name`) AS `task_project_name`,`t`.`task_value` AS `task_value`,`t`.`task_currency` AS `task_currency`,`t`.`task_completed` AS `task_completed`,`frt`.`next_followup_task_upcoming` AS `next_followup_task_upcoming`,`frt`.`next_followup_task_last` AS `next_followup_task_last`,coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) AS `next_followup_task_effective`,`fra`.`next_followup_activities_upcoming` AS `next_followup_activities_upcoming`,`fra`.`next_followup_activities_last` AS `next_followup_activities_last`,coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) AS `next_followup_activities_effective`,case when coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) is null then coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) when coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) is null then coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) else least(coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`),coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`)) end AS `next_followup_any_effective`,case when `t`.`task_end_performed` is not null then 1 else 0 end AS `is_completed`,case when `t`.`task_end` is not null and `t`.`task_end` < curdate() and `t`.`task_end_performed` is null then 1 else 0 end AS `is_plan_overdue`,case when `t`.`task_end` is not null and `t`.`task_end` < curdate() and `t`.`task_end_performed` is null then to_days(curdate()) - to_days(`t`.`task_end`) else 0 end AS `days_plan_overdue`,case when case when coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) is null then coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) when coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) is null then coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) else least(coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`),coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`)) end is null then 1 else 0 end AS `followup_any_is_missing`,case when case when coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) is null then coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) when coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) is null then coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) else least(coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`),coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`)) end = curdate() then 1 else 0 end AS `followup_any_is_today`,case when case when coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) is null then coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) when coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`) is null then coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`) else least(coalesce(`frt`.`next_followup_task_upcoming`,`frt`.`next_followup_task_last`),coalesce(`fra`.`next_followup_activities_upcoming`,`fra`.`next_followup_activities_last`)) end < curdate() then 1 else 0 end AS `followup_any_is_overdue`,case when `t`.`task_status` = 1 and `t`.`task_end_performed` is null and `t`.`task_start` is not null then to_days(curdate()) - to_days(`t`.`task_start`) else NULL end AS `open_age_days` from ((((((((`tbTask` `t` left join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) left join `tbStatusType` `st` on(`t`.`task_status` = `st`.`statustype_id`)) left join `tbUser` `o` on(`t`.`task_owner_id` = `o`.`user_id`)) left join `tbUser` `ot` on(`t`.`task_temp_owner_id` = `ot`.`user_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbProject` `p` on(`t`.`task_project_id` = `p`.`project_id`)) left join (select `r`.`taskrecord_task_id` AS `task_id`,min(case when `r`.`taskrecord_next_followup` >= curdate() then `r`.`taskrecord_next_followup` end) AS `next_followup_task_upcoming`,max(`r`.`taskrecord_next_followup`) AS `next_followup_task_last` from `tbTaskRecord` `r` where `r`.`taskrecord_task_id` <> 0 and (`r`.`taskrecord_activity_id` = 0 or `r`.`taskrecord_activity_id` is null) and `r`.`taskrecord_next_followup` is not null group by `r`.`taskrecord_task_id`) `frt` on(`frt`.`task_id` = `t`.`task_id`)) left join (select `r`.`taskrecord_task_id` AS `task_id`,min(case when `r`.`taskrecord_next_followup` >= curdate() then `r`.`taskrecord_next_followup` end) AS `next_followup_activities_upcoming`,max(`r`.`taskrecord_next_followup`) AS `next_followup_activities_last` from `tbTaskRecord` `r` where `r`.`taskrecord_task_id` <> 0 and `r`.`taskrecord_activity_id` <> 0 and `r`.`taskrecord_next_followup` is not null group by `r`.`taskrecord_task_id`) `fra` on(`fra`.`task_id` = `t`.`task_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskIncentive`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskIncentive`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskIncentive` AS select `t`.`task_id` AS `task_id`,`t`.`task_tasktype_id` AS `task_tasktype_id`,`tp`.`tasktype_name` AS `task_tasktype_name`,`t`.`task_subtrack` AS `task_use_case`,`t`.`task_owner_id` AS `task_owner_id`,case when `t`.`task_owner_id` = 0 then 'NO CSM' else `o`.`user_name` end AS `task_owner_name`,`t`.`task_customer_id` AS `task_client_id`,`c`.`company_name` AS `task_client_name`,`t`.`task_start` AS `task_start`,`t`.`task_end` AS `task_end`,case when `t`.`task_status` not in (4,5,6) then to_days(`t`.`task_end`) - to_days(`t`.`task_start`) else 0 end AS `task_days`,`t`.`task_end_fy` AS `task_end_fy`,`t`.`task_status` AS `task_status_id`,`tst`.`statustype_name` AS `task_status_name`,`t`.`task_value` AS `task_value`,`t`.`task_forecast` AS `task_forecast`,`t`.`task_backlog` AS `task_backlog` from ((((`tbTask` `t` left join `tbUser` `o` on(`t`.`task_owner_id` = `o`.`user_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) left join `tbStatusType` `tst` on(`t`.`task_status` = `tst`.`statustype_id`)) where `t`.`task_eligible` = 'Y' and `tp`.`tasktype_incentive` <> 0 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskNoCSMListCustomer`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskNoCSMListCustomer`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskNoCSMListCustomer` AS select `t`.`task_owner_id` AS `task_owner_id`,`t`.`task_tasktype_id` AS `task_type_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name`,`at`.`accountteam_user_id` AS `accountteam_am_id`,`u`.`user_name` AS `accountteam_am_name`,`csm`.`accountteam_user_id` AS `accountteam_csm_id` from ((((`tbTask` `t` left join `tbAccountTeam` `at` on(`t`.`task_customer_id` = `at`.`accountteam_company_id` and `at`.`accountteam_user_type` = 'AM' and `at`.`accountteam_allocated` <> 0)) left join `tbUser` `u` on(`at`.`accountteam_user_id` = `u`.`user_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbAccountTeam` `csm` on(`t`.`task_customer_id` = `csm`.`accountteam_company_id` and `csm`.`accountteam_user_type` = 'CSM' and `csm`.`accountteam_allocated` <> 0)) where `t`.`task_owner_id` = 0 and `t`.`task_customer_id` > 0 and `t`.`task_status` = 1 group by `t`.`task_owner_id`,`t`.`task_tasktype_id`,`t`.`task_customer_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskOwnerMinOccurrence`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskOwnerMinOccurrence`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskOwnerMinOccurrence` AS select `v`.`task_owner_id` AS `task_owner_id`,`v`.`task_owner_name` AS `task_owner_name`,`v`.`task_type_id` AS `task_type_id`,`v`.`task_type_name` AS `task_type_name`,`v`.`occurrences` AS `occurrences` from (select `t`.`task_owner_id` AS `task_owner_id`,`u`.`user_name` AS `task_owner_name`,`t`.`task_tasktype_id` AS `task_type_id`,`ty`.`tasktype_name` AS `task_type_name`,count(`t`.`task_id`) AS `occurrences`,row_number() over ( partition by `t`.`task_tasktype_id` order by count(`t`.`task_id`)) AS `rn` from ((`tbTask` `t` join `tbUser` `u` on(`t`.`task_owner_id` = `u`.`user_id` and `u`.`user_termination` is null)) join `tbTaskType` `ty` on(`t`.`task_tasktype_id` = `ty`.`tasktype_id`)) where `t`.`task_status` not in (4,5,6,10) group by `t`.`task_owner_id`,`u`.`user_name`,`t`.`task_tasktype_id`,`ty`.`tasktype_name`) `v` where `v`.`rn` = 1 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskRACI`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskRACI`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskRACI` AS select `r`.`taskraci_task_id` AS `taskraci_task_id`,`r`.`taskraci_subtask_id` AS `taskraci_subtask_id`,`r`.`taskrack_stakeholder_id` AS `taskrack_stakeholder_id`,`u`.`user_name` AS `taskrack_stakeholder_name`,`r`.`taskraci_stakeholder_type` AS `taskraci_stakeholder_type`,`r`.`taskraci_responsibility` AS `taskraci_responsibility` from ((select `t2`.`task_id` AS `taskraci_task_id`,`t1`.`activity_id` AS `taskraci_subtask_id`,`t2`.`task_owner_id` AS `taskrack_stakeholder_id`,'INTERNAL' AS `taskraci_stakeholder_type`,'O' AS `taskraci_responsibility` from (`tbTaskActivity` `t1` join `tbTask` `t2` on(`t1`.`activity_task_id` = `t2`.`task_id`)) where `t2`.`task_owner_id` > 0 and `t1`.`activity_id` > 0 union select `t2`.`task_id` AS `taskraci_task_id`,`t1`.`activity_id` AS `taskraci_subtask_id`,`t2`.`task_temp_owner_id` AS `taskrack_stakeholder_id`,'INTERNAL' AS `taskraci_stakeholder_type`,'O' AS `taskraci_responsibility` from (`tbTaskActivity` `t1` join `tbTask` `t2` on(`t1`.`activity_task_id` = `t2`.`task_id`)) where `t2`.`task_temp_owner_id` > 0 and `t1`.`activity_id` > 0 union select `t2`.`activity_task_id` AS `taskraci_task_id`,`t1`.`taskraci_subtask_id` AS `taskraci_subtask_id`,`t1`.`taskraci_stakeholder_id` AS `taskraci_stakeholder_id`,`t1`.`taskraci_stakeholder_type` AS `taskraci_stakeholder_type`,`t1`.`taskraci_responsibility` AS `taskraci_responsibility` from (`tbTaskRACI` `t1` join `tbTaskActivity` `t2` on(`t1`.`taskraci_subtask_id` = `t2`.`activity_id`)) where `t1`.`taskraci_subtask_id` > 0 and `t1`.`taskraci_enabled` <> 0) `r` left join `tbUser` `u` on(`r`.`taskrack_stakeholder_id` = `u`.`user_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskRecordNextFollowUp`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUp`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskRecordNextFollowUp` AS select `t`.`task_id` AS `task_id`,`t`.`task_tasktype_id` AS `task_tasktype_id`,`tp`.`tasktype_name` AS `tasktype_name`,`a`.`activity_id` AS `activity_id`,`a`.`activity_name` AS `activity_name`,`t`.`task_owner_id` AS `task_owner_id`,`u`.`user_name` AS `task_owner_name`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name`,date_format(case when (select max(`tbTaskRecord`.`taskrecord_next_followup`) from `tbTaskRecord` where `tbTaskRecord`.`taskrecord_activity_id` = `a`.`activity_id`) is null then `t`.`task_created_in` else (select max(`tbTaskRecord`.`taskrecord_next_followup`) from `tbTaskRecord` where `tbTaskRecord`.`taskrecord_activity_id` = `a`.`activity_id`) end,'%Y-%m-%d') AS `next_follow_up` from ((((`tbTask` `t` left join `tbTaskActivity` `a` on(`t`.`task_id` = `a`.`activity_task_id`)) left join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join `tbUser` `u` on(`t`.`task_owner_id` = `u`.`user_id`)) where `t`.`task_owner_id` > 0 and `t`.`task_customer_id` > 0 and `t`.`task_status` not in (4,5,6,10) and `a`.`activity_status` not in (4,5,6,10) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskRecordNextFollowUpCurrentWeek`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUpCurrentWeek`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskRecordNextFollowUpCurrentWeek` AS with latest as (select `tr`.`taskrecord_task_id` AS `task_id`,`tr`.`taskrecord_activity_id` AS `activity_id`,max(`tr`.`taskrecord_next_followup`) AS `next_followup` from `tbTaskRecord` `tr` group by `tr`.`taskrecord_task_id`,`tr`.`taskrecord_activity_id`)select `l`.`task_id` AS `task_id`,`ty`.`tasktype_name` AS `task_type_name`,`l`.`activity_id` AS `activity_id`,`a`.`activity_name` AS `activity_name`,`l`.`next_followup` AS `next_followup`,`t`.`task_status` AS `task_status`,`a`.`activity_status` AS `activity_status`,`t`.`task_owner_id` AS `task_owner_id`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name` from ((((`latest` `l` left join `tbTaskActivity` `a` on(`a`.`activity_id` = `l`.`activity_id`)) left join `tbTask` `t` on(`t`.`task_id` = `l`.`task_id`)) left join `tbTaskType` `ty` on(`t`.`task_tasktype_id` = `ty`.`tasktype_id`)) left join `tbCompany` `c` on(`c`.`company_id` = `t`.`task_customer_id`)) where `a`.`activity_status` not in (4,5,6,10) and `t`.`task_status` not in (4,10) and yearweek(`l`.`next_followup`,2) = yearweek(curdate(),2) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskRecordNextFollowUpDelayed`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUpDelayed`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskRecordNextFollowUpDelayed` AS with latest as (select `tr`.`taskrecord_task_id` AS `task_id`,`tr`.`taskrecord_activity_id` AS `activity_id`,max(`tr`.`taskrecord_next_followup`) AS `next_followup` from `tbTaskRecord` `tr` group by `tr`.`taskrecord_task_id`,`tr`.`taskrecord_activity_id`)select `l`.`task_id` AS `task_id`,`ty`.`tasktype_name` AS `task_type_name`,`l`.`activity_id` AS `activity_id`,`a`.`activity_name` AS `activity_name`,`l`.`next_followup` AS `next_followup`,`t`.`task_status` AS `task_status`,`a`.`activity_status` AS `activity_status`,`t`.`task_owner_id` AS `task_owner_id`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name` from ((((`latest` `l` left join `tbTaskActivity` `a` on(`a`.`activity_id` = `l`.`activity_id`)) left join `tbTask` `t` on(`t`.`task_id` = `l`.`task_id`)) left join `tbTaskType` `ty` on(`t`.`task_tasktype_id` = `ty`.`tasktype_id`)) left join `tbCompany` `c` on(`c`.`company_id` = `t`.`task_customer_id`)) where `a`.`activity_status` not in (4,5,6,10) and `t`.`task_status` not in (4,10) and `l`.`next_followup` < curdate() */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskRecordNextFollowUpNextWeek`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUpNextWeek`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskRecordNextFollowUpNextWeek` AS with latest as (select `tr`.`taskrecord_task_id` AS `task_id`,`tr`.`taskrecord_activity_id` AS `activity_id`,max(`tr`.`taskrecord_next_followup`) AS `next_followup` from `tbTaskRecord` `tr` group by `tr`.`taskrecord_task_id`,`tr`.`taskrecord_activity_id`)select `l`.`task_id` AS `task_id`,`ty`.`tasktype_name` AS `task_type_name`,`l`.`activity_id` AS `activity_id`,`a`.`activity_name` AS `activity_name`,`l`.`next_followup` AS `next_followup`,`t`.`task_status` AS `task_status`,`a`.`activity_status` AS `activity_status`,`t`.`task_owner_id` AS `task_owner_id`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name` from ((((`latest` `l` left join `tbTaskActivity` `a` on(`a`.`activity_id` = `l`.`activity_id`)) left join `tbTask` `t` on(`t`.`task_id` = `l`.`task_id`)) left join `tbTaskType` `ty` on(`t`.`task_tasktype_id` = `ty`.`tasktype_id`)) left join `tbCompany` `c` on(`c`.`company_id` = `t`.`task_customer_id`)) where `a`.`activity_status` not in (4,5,6,10) and `t`.`task_status` not in (4,10) and yearweek(`l`.`next_followup`,2) = yearweek(curdate() + interval 1 week,2) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskRecordNextFollowUpToday`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskRecordNextFollowUpToday`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskRecordNextFollowUpToday` AS with latest as (select `tr`.`taskrecord_task_id` AS `task_id`,`tr`.`taskrecord_activity_id` AS `activity_id`,max(`tr`.`taskrecord_next_followup`) AS `next_followup` from `tbTaskRecord` `tr` group by `tr`.`taskrecord_task_id`,`tr`.`taskrecord_activity_id`)select `l`.`task_id` AS `task_id`,`ty`.`tasktype_name` AS `task_type_name`,`l`.`activity_id` AS `activity_id`,`a`.`activity_name` AS `activity_name`,`l`.`next_followup` AS `next_followup`,`t`.`task_status` AS `task_status`,`a`.`activity_status` AS `activity_status`,`t`.`task_owner_id` AS `task_owner_id`,`t`.`task_temp_owner_id` AS `task_temp_owner_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name` from ((((`latest` `l` left join `tbTaskActivity` `a` on(`a`.`activity_id` = `l`.`activity_id`)) left join `tbTask` `t` on(`t`.`task_id` = `l`.`task_id`)) left join `tbTaskType` `ty` on(`t`.`task_tasktype_id` = `ty`.`tasktype_id`)) left join `tbCompany` `c` on(`c`.`company_id` = `t`.`task_customer_id`)) where `a`.`activity_status` not in (4,5,6,10) and `t`.`task_status` not in (4,10) and (`l`.`next_followup` = curdate() or `l`.`next_followup` is null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskSIPNewOpportunity`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskSIPNewOpportunity`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskSIPNewOpportunity` AS select `t`.`task_id` AS `task_id`,`t`.`task_tasktype_id` AS `task_tasktype_id`,`tp`.`tasktype_name` AS `task_tasktype_name`,`t`.`task_owner_id` AS `task_owner_id`,`o`.`user_name` AS `task_owner_name`,`s`.`squad_user_id` AS `task_owner_squad_id`,`d`.`department_name` AS `task_owner_squad_name`,`t`.`task_customer_id` AS `task_client_id`,`c`.`company_name` AS `task_client_name`,`t`.`task_reference` AS `task_reference`,`t`.`task_start` AS `task_start`,case when `t`.`task_status` in (9,10) then `t`.`task_end` else NULL end AS `task_end`,case when `t`.`task_status` not in (4,5,6) and `t`.`task_end` is not null and `t`.`task_start` is not null then to_days(`t`.`task_end`) - to_days(`t`.`task_start`) else 0 end AS `task_days`,case when `t`.`task_status` in (9,10) then `t`.`task_end_fy` else NULL end AS `task_end_fy`,`t`.`task_status` AS `task_status_id`,`tst`.`statustype_name` AS `task_status_name`,`t`.`task_deal_id` AS `task_deal_id`,`t`.`task_currency` AS `task_currency`,`t`.`task_value` AS `task_deal_value`,`t`.`task_highlight` AS `task_note` from ((((((`tbTask` `t` left join `tbUser` `o` on(`t`.`task_owner_id` = `o`.`user_id`)) left join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) left join (select `s1`.`squad_id` AS `squad_id`,`s1`.`squad_user_id` AS `squad_user_id`,`s1`.`squad_department_id` AS `squad_department_id`,`s1`.`squad_level_id` AS `squad_level_id`,`s1`.`squad_upgrade` AS `squad_upgrade` from (`tbSquad` `s1` join (select `tbSquad`.`squad_user_id` AS `squad_user_id`,max(`tbSquad`.`squad_upgrade`) AS `max_upgrade` from `tbSquad` group by `tbSquad`.`squad_user_id`) `s2` on(`s1`.`squad_user_id` = `s2`.`squad_user_id` and `s1`.`squad_upgrade` = `s2`.`max_upgrade`))) `s` on(`s`.`squad_user_id` = `t`.`task_owner_id`)) left join `tbDepartment` `d` on(`s`.`squad_department_id` = `d`.`department_id`)) left join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) left join `tbStatusType` `tst` on(`t`.`task_status` = `tst`.`statustype_id`)) where `t`.`task_tasktype_id` = 11 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskTechnologyAdoptionReport`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskTechnologyAdoptionReport`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskTechnologyAdoptionReport` AS select `t`.`task_id` AS `task_id`,`t`.`task_customer_id` AS `task_customer_id`,`c`.`company_name` AS `task_customer_name`,`t`.`task_tasktype_id` AS `task_type_id`,`ty`.`tasktype_name` AS `task_type_name`,`t`.`task_owner_id` AS `task_owner_id`,`o`.`user_name` AS `task_owner_name`,`t`.`task_status` AS `task_status_id`,`s`.`statustype_name` AS `task_status_name`,case when `t`.`task_start_performed` is null then `t`.`task_start` else `t`.`task_start_performed` end AS `task_start`,case when `t`.`task_end_performed` is null then `t`.`task_end` else `t`.`task_end_performed` end AS `task_end` from ((((`tbTask` `t` join `tbTaskType` `ty` on(`t`.`task_tasktype_id` = `ty`.`tasktype_id`)) join `tbCompany` `c` on(`t`.`task_customer_id` = `c`.`company_id`)) join `tbUser` `o` on(`t`.`task_owner_id` = `o`.`user_id`)) join `tbStatusType` `s` on(`t`.`task_status` = `s`.`statustype_id`)) where `ty`.`tasktype_adoption` = -1 order by `t`.`task_start` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwTaskValueRollup`
--

/*!50001 DROP VIEW IF EXISTS `vwTaskValueRollup`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwTaskValueRollup` AS select `t`.`task_id` AS `task_id`,`t`.`task_owner_id` AS `task_owner_id`,`tp`.`tasktype_for_team` AS `task_for_team`,coalesce(`av`.`sum_brl`,0) AS `task_value_sum_brl`,coalesce(`av`.`sum_usd`,0) AS `task_value_sum_usd`,case when coalesce(`av`.`sum_brl`,0) > 0 or coalesce(`av`.`sum_usd`,0) > 0 then 1 else 0 end AS `has_activity_value`,case when coalesce(`av`.`sum_brl`,0) > 0 then `av`.`sum_brl` when `t`.`task_currency` = 'BRL' and `t`.`task_value` is not null and `t`.`task_value` <> 0 then `t`.`task_value` else 0 end AS `task_value_effective_brl`,case when coalesce(`av`.`sum_usd`,0) > 0 then `av`.`sum_usd` when `t`.`task_currency` = 'USD' and `t`.`task_value` is not null and `t`.`task_value` <> 0 then `t`.`task_value` else 0 end AS `task_value_effective_usd`,case when coalesce(`av`.`sum_brl`,0) > 0 or coalesce(`av`.`sum_usd`,0) > 0 then 'ACTIVITY' when `t`.`task_value` is not null and `t`.`task_value` <> 0 then 'TASK' else 'NONE' end AS `value_source` from ((`tbTask` `t` left join `tbTaskType` `tp` on(`t`.`task_tasktype_id` = `tp`.`tasktype_id`)) left join (select `a`.`activity_task_id` AS `task_id`,sum(case when `a`.`activity_currency` = 'BRL' then coalesce(`a`.`activity_value`,0) else 0 end) AS `sum_brl`,sum(case when `a`.`activity_currency` = 'USD' then coalesce(`a`.`activity_value`,0) else 0 end) AS `sum_usd` from `tbTaskActivity` `a` where `a`.`activity_value` is not null and `a`.`activity_value` <> 0 and `a`.`activity_currency` in ('BRL','USD') group by `a`.`activity_task_id`) `av` on(`av`.`task_id` = `t`.`task_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwUseCase`
--

/*!50001 DROP VIEW IF EXISTS `vwUseCase`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwUseCase` AS select `uc`.`uc_id` AS `uc_id`,`uc`.`uc_architecture` AS `uc_architecture`,`uc`.`uc_solution_domain` AS `uc_solution_domain`,`uc`.`uc_use_case` AS `uc_use_case`,`uc`.`uc_primary_product_id` AS `uc_primary_product_id`,`p`.`product_name` AS `uc_primary_product_name`,`uc`.`uc_vendor_id` AS `uc_vendor_id`,`c`.`company_name` AS `uc_vendor_name`,`uc`.`uc_key_supporting_products` AS `uc_key_supporting_products`,`uc`.`uc_key_capabilities` AS `uc_key_capabilities`,`uc`.`uc_it_operations_benefits` AS `uc_it_operations_benefits`,`uc`.`uc_business_benefits` AS `uc_business_benefits`,`uc`.`uc_success_metrics` AS `uc_success_metrics`,`uc`.`uc_business_outcomes` AS `uc_business_outcomes`,`uc`.`uc_description` AS `uc_description` from ((`tbUseCase` `uc` join `tbProduct` `p` on(`uc`.`uc_primary_product_id` = `p`.`product_id`)) join `tbCompany` `c` on(`uc`.`uc_vendor_id` = `c`.`company_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwUseCaseExitCriteria`
--

/*!50001 DROP VIEW IF EXISTS `vwUseCaseExitCriteria`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwUseCaseExitCriteria` AS select `ec`.`ucec_id` AS `ucec_id`,`ec`.`ucec_tasktype_id` AS `ucec_tasktype_id`,`ec`.`ucec_uc_id` AS `ucec_uc_id`,`ec`.`ucec_seq` AS `ucec_seq`,`ec`.`ucec_name` AS `ucec_name`,`ec`.`ucec_objective` AS `ucec_objective`,`ec`.`ucec_scope` AS `ucec_scope`,`ec`.`ucec_expected_results` AS `ucec_expected_results`,`ec`.`ucec_update_date` AS `ucec_update_date`,`tt`.`tasktype_name` AS `ucec_tasktype_name` from (`tbUseCaseExitCriteria` `ec` join `tbTaskType` `tt` on(`ec`.`ucec_tasktype_id` = `tt`.`tasktype_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwUser`
--

/*!50001 DROP VIEW IF EXISTS `vwUser`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwUser` AS select `u`.`user_id` AS `user_id`,`u`.`user_name` AS `user_name`,`u`.`user_company_id` AS `user_company_id`,case when `u`.`user_company_id` = 0 then 'NTT' else `c`.`company_name` end AS `user_company_name`,`u`.`user_telephone` AS `user_telephone`,`u`.`user_cellphone` AS `user_cellphone`,`u`.`user_email` AS `user_email`,`u`.`user_type` AS `user_type`,`u`.`user_department` AS `user_department`,`u`.`user_job_title` AS `user_job_title`,`u`.`user_hiring` AS `user_hiring`,`u`.`user_termination` AS `user_termination` from (`tbUser` `u` left join `tbCompany` `c` on(`c`.`company_id` = `u`.`user_company_id`)) where `u`.`user_name`  not like 'VAGO %' and `u`.`user_name` is not null and `u`.`user_name` <> '-' and `u`.`user_name` <> 'N/A' */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vwUserNTT`
--

/*!50001 DROP VIEW IF EXISTS `vwUserNTT`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`pegasus`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vwUserNTT` AS select `tbUser`.`user_id` AS `user_id`,`tbUser`.`user_name` AS `user_name`,`tbUser`.`user_full_name` AS `user_full_name`,`tbUser`.`user_alternative_name` AS `user_alternative_name`,`tbUser`.`user_telephone` AS `user_telephone`,`tbUser`.`user_cellphone` AS `user_cellphone`,`tbUser`.`user_email` AS `user_email`,`tbUser`.`user_type` AS `user_type`,`tbUser`.`user_company_id` AS `user_company_id`,`tbUser`.`user_department` AS `user_department`,`tbUser`.`user_job_title` AS `user_job_title`,`tbUser`.`user_admin` AS `user_admin`,`tbUser`.`user_manager` AS `user_manager`,`tbUser`.`user_language` AS `user_language`,`tbUser`.`user_password` AS `user_password`,`tbUser`.`user_change_passwd` AS `user_change_passwd`,`tbUser`.`user_hiring` AS `user_hiring`,`tbUser`.`user_termination` AS `user_termination`,`tbUser`.`user_allow_import_xls` AS `user_allow_import_xls`,`tbUser`.`user_allow_adoption_dash` AS `user_allow_adoption_dash`,`tbUser`.`user_allow_capacity_dash` AS `user_allow_capacity_dash`,`tbUser`.`user_allow_project_dash` AS `user_allow_project_dash`,`tbUser`.`user_allow_notafiscal_dash` AS `user_allow_notafiscal_dash`,`tbUser`.`user_allow_contract_dash` AS `user_allow_contract_dash`,`tbUser`.`user_allow_iteminfo_dash` AS `user_allow_iteminfo_dash`,`tbUser`.`user_allow_technical_dash` AS `user_allow_technical_dash`,`tbUser`.`user_allow_operational_dash` AS `user_allow_operational_dash`,`tbUser`.`user_allow_panorama_dash` AS `user_allow_panorama_dash` from `tbUser` where `tbUser`.`user_name` not in ('vago %','A DEFINIR') and `tbUser`.`user_company_id` = 0 and `tbUser`.`user_termination` is null order by `tbUser`.`user_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-25  6:00:02
