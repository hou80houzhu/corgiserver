/*
Navicat MySQL Data Transfer

Source Server         : localhost_3306
Source Server Version : 50621
Source Host           : localhost:3306
Source Database       : todo

Target Server Type    : MYSQL
Target Server Version : 50621
File Encoding         : 65001

Date: 2016-02-12 22:52:55
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for `main`
-- ----------------------------
DROP TABLE IF EXISTS `main`;
CREATE TABLE `main` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content` varchar(1000) DEFAULT NULL,
  `time` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of main
-- ----------------------------
INSERT INTO `main` VALUES ('30', 'opopop', '2147483647');
INSERT INTO `main` VALUES ('33', '3443', '2147483647');
INSERT INTO `main` VALUES ('39', '3434', '2147483647');
INSERT INTO `main` VALUES ('40', 'werwer', '2147483647');
INSERT INTO `main` VALUES ('42', 'werwer', '2147483647');
