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

