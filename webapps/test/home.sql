/*
Navicat MySQL Data Transfer

Source Server         : localhost_3306
Source Server Version : 50621
Source Host           : localhost:3306
Source Database       : home

Target Server Type    : MYSQL
Target Server Version : 50621
File Encoding         : 65001

Date: 2016-02-01 18:17:54
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for `brand`
-- ----------------------------
DROP TABLE IF EXISTS `brand`;
CREATE TABLE `brand` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `image` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `url` varchar(2000) COLLATE utf8_unicode_ci DEFAULT NULL,
  `time` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=15 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of brand
-- ----------------------------
INSERT INTO `brand` VALUES ('1', '1111', 'uploads/brand/1450329811292.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('2', 'qwqw', 'uploads/brand/1450329825941.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('3', 'wrewer', 'uploads/brand/1450329839026.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('4', 'werwer', 'uploads/brand/1450329848562.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('5', 'rty5645', 'uploads/brand/1450329859953.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('6', '7867867', 'uploads/brand/1450329871187.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('7', '345345', 'uploads/brand/1450329881051.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('8', 'fgjhdghd', 'uploads/brand/1450329890081.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('9', '67567567', 'uploads/brand/1450329899671.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('10', '67567567', 'uploads/brand/1450329900036.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('11', 'gjdhdfgh', 'uploads/brand/1450329911994.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('12', '879789789', 'uploads/brand/1450329922257.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('13', '45645645', 'uploads/brand/1450329932606.png', 'http://www.baidu.com', null);
INSERT INTO `brand` VALUES ('14', '89789789', 'uploads/brand/1450329942443.png', 'http://www.baidu.com', null);

-- ----------------------------
-- Table structure for `menu`
-- ----------------------------
DROP TABLE IF EXISTS `menu`;
CREATE TABLE `menu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `img` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `view` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `option` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `action` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `url` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `pid` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=9 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of menu
-- ----------------------------
INSERT INTO `menu` VALUES ('1', 'HOME', 'fa fa-home', 'admin.main.quickmenu', 'admin.option.test.quickmenu', null, null, '0');
INSERT INTO `menu` VALUES ('2', '系统管理', 'fa fa-gears', 'admin.main.maincontainer', null, null, null, '0');
INSERT INTO `menu` VALUES ('3', '数据管理', 'fa fa-file-text-o', 'admin.main.maincontainer', null, null, null, '0');
INSERT INTO `menu` VALUES ('4', '用户管理', 'fa fa-file-text-o', 'admin.group.tablegroup', 'admin.option.user.table', null, null, '2');
INSERT INTO `menu` VALUES ('8', '定制响应式页面', 'fa fa-crop', null, null, 'blank', 'editor', '0');
INSERT INTO `menu` VALUES ('6', '新闻', 'fa fa-file-text-o', 'admin.group.tablegroup', 'admin.option.news.table', null, null, '3');
INSERT INTO `menu` VALUES ('7', '品牌', 'fa fa-file-text-o', 'admin.group.tablegroup', 'admin.option.brand.table', null, null, '3');

-- ----------------------------
-- Table structure for `news`
-- ----------------------------
DROP TABLE IF EXISTS `news`;
CREATE TABLE `news` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8_unicode_ci,
  `time` varchar(20) COLLATE utf8_unicode_ci DEFAULT NULL,
  `image` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `author` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=12 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of news
-- ----------------------------
INSERT INTO `news` VALUES ('1', '123123', '<img style=\"width:100%\" src=\"http://localhost:8084/ttsxhome/upload/editor/1450231231561.png\"><div><br></div><div><div><b>1??????</b></div><div><br></div><div>????????????????????????????????iPhone 7??????????????????????????????????????iPhone????</div><div><br></div><div>???????????????GT Advanced Technologies??????????????????????????????????????????(???)??????????????25%???</div><div><span style=\"line-height: 1.6;\"><br></span></div><div><span style=\"line-height: 1.6;\"><b>2????????</b></span></div><div><br></div><div>??????????????????????????6s????????iPhone6?????????????????</div><div><br></div><div>????????iPhone?????????????????????????iPhone???????????????????????????????????????????????????????????????????</div></div><div><br></div><div><img style=\"width:100%\" src=\"http://localhost:8084/ttsxhome/upload/editor/1450231314422.png\"></div><div><br></div><div><div><b>1??????</b></div><div><br></div><div>????????????????????????????????iPhone 7??????????????????????????????????????iPhone????</div><div><br></div><div>???????????????GT Advanced Technologies??????????????????????????????????????????(???)??????????????25%???</div><div><br></div><div><b>2????????</b></div><div><br></div><div>??????????????????????????6s????????iPhone6?????????????????</div><div><br></div><div>????????iPhone?????????????????????????iPhone???????????????????????????????????????????????????????????????????</div></div>', '2015-12-18 12:28:41', 'uploads/news/1450171588399.png', '123123');
INSERT INTO `news` VALUES ('2', '1212', '1221122', null, 'uploads/news/1450171604247.png', '1212');
INSERT INTO `news` VALUES ('3', 'r\'we\'r\'w', 'sdfadsfasdf', null, 'uploads/news/1450171618276.png', 'sfasd');
INSERT INTO `news` VALUES ('4', 'sdfwer', 'asdfasdfasdfasdfasdf', null, 'uploads/news/1450171635296.png', 'wewe');
INSERT INTO `news` VALUES ('5', 'werwer', 'asdfasdfasdf', null, 'uploads/news/1450171645084.png', 'werwerwer');
INSERT INTO `news` VALUES ('6', 'xvzxcv', 'asdfasdfasdf', null, 'uploads/news/1450171653955.png', 'zxcvzcv');
INSERT INTO `news` VALUES ('7', 'werw3', 'safsdfasdfasdf', null, 'uploads/news/1450171664985.png', '2323');
INSERT INTO `news` VALUES ('8', 'werwe2323', 'asdfasdfasdf', null, 'uploads/news/1450171708516.png', 'wer');
INSERT INTO `news` VALUES ('9', 'dhsdfgs', 'axdfadfasdfasdfasdf', null, 'uploads/news/1450171721320.png', 'fgwerw');
INSERT INTO `news` VALUES ('10', '3434', '3433434343434', '2015-12-18 12:28:02', 'uploads/news/1450412882755.png', '3434');
INSERT INTO `news` VALUES ('11', 'sdfsdf', '<div style=\"text-align: justify; text-indent: 32px;\"><span style=\"color: rgb(37, 37, 37); font-family: ??, sans-serif; font-size: 16px; line-height: 28px;\">???12?18?? ???????????????????????????0-3????????????????????????????????????????????????????????????????????????????????????????????????????</span></div>', '2015-12-18 04:08:02', 'uploads/news/1450425200279.png', 'sdfsdfsdf');

-- ----------------------------
-- Table structure for `product`
-- ----------------------------
DROP TABLE IF EXISTS `product`;
CREATE TABLE `product` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `descc` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `image` varchar(120) COLLATE utf8_unicode_ci DEFAULT NULL,
  `pagename` varchar(100) COLLATE utf8_unicode_ci DEFAULT NULL,
  `title` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of product
-- ----------------------------
INSERT INTO `product` VALUES ('1', '123', 'uploads/product/1446607275498.png', '3123123', '123123');

-- ----------------------------
-- Table structure for `role`
-- ----------------------------
DROP TABLE IF EXISTS `role`;
CREATE TABLE `role` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `rolename` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `rolemapping` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of role
-- ----------------------------
INSERT INTO `role` VALUES ('1', '超级管理员', null);

-- ----------------------------
-- Table structure for `user`
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `password` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  `role` int(11) DEFAULT NULL,
  `icon` varchar(64) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=34 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Records of user
-- ----------------------------
INSERT INTO `user` VALUES ('1', 'admin', '111111', '1', '11');
INSERT INTO `user` VALUES ('2', 'aa', 'aa', '1', '11');
INSERT INTO `user` VALUES ('3', 'bb', 'bb', '1', 'bb');
INSERT INTO `user` VALUES ('4', 'cc', 'cc', '2', 'cc');
INSERT INTO `user` VALUES ('5', 'dd', 'dd', '3', 'dd');
INSERT INTO `user` VALUES ('6', 'ee', 'ee', '4', 'ee');
