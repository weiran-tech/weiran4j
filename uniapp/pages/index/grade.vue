<template>
	<view>
		<topBox pageName='成绩查询' :myInfo='myInfo' :cjcxId="cjcx_id" :cjcxName="cjcx_name"
			@updateCjcxType="handleCjcxTypeChange"></topBox>

		<view class='app_imgBox'>
			<view class='title'>
				{{cjcx_name}}
			</view>
		</view>

		<!-- ******************************学生查询****************************** -->
		<view v-if="cjcx_name=='学生查询'">
			<view class='pageBox zzz3' v-if="page_type_name=='成绩查询'">
				<view class='infoBox'>
					<view class='e1'>
						<view class='left_text e2'>
							<view>届</view>
							<view>数：</view>
						</view>
						<picker @change="bindPickerChange1" :range="array1">
							<view class='inputs' v-if="year">{{year}}</view>
							<view class='inputs_no' v-else>请选择届数</view>
						</picker>
					</view>
					<view class='info_line'></view>
					<!-- <view class='e1' v-if="year">
						<view class='left_text e2'>
							<view>赛</view>
							<view>事：</view>
						</view>
						<picker @change="bindPickerChange2" :range="array2" range-key="name">
							<view class='inputs' v-if="competitionname">{{competitionname}}</view>
							<view class='inputs_no' v-else>请选择赛事</view>
						</picker>
					</view> -->
					<!-- <view class='info_line' v-if="year"></view> -->
					<view class='e1'>
						<view class='left_text e2'>
							<view>姓</view>
							<view>名：</view>
						</view>
						<input class='inputs' type='text' v-model='name' placeholder='请输入您的姓名'
							placeholder-style='color:#999999' />
					</view>
					<view class='info_line'></view>
					<view class='e1'>
						<view class='left_text e2'>
							<view>身</view>
							<view>份</view>
							<view>证</view>
							<view>号：</view>
						</view>
						<input class='inputs' type='text' v-model='uniid' placeholder='请输入报名时填写的证件号'
							placeholder-style='color:#999999' />
					</view>
					<view class='info_line'></view>
					<!-- <view class='yellowBox'>
						<view>1、查询学生成绩：请输入报名时填写的学生姓名与证件号。</view>
						<view>2、查询教师证书：首次查询请使用教师姓名和手机号码；领取电子证书后，可使用姓名 + 手机号、身份证号或证书编号中任一方式进行查询。</view>
						<view>3、查询院校证书：请输入院校在注册登录时使用的完整名称。</view>
						<view>4、如有疑问，请发送邮件到 XXX 咨询，邮件中注明教师姓名、手机号、身份证号、学校、辅导的学生等信息。</view>
					</view> -->
					<view class='button pointer' @click="goChaXun()">立即查询</view>
				</view>
			</view>

		</view>

		<!-- ******************************教师/单位证书****************************** -->
		<view v-if="cjcx_name=='教师/单位证书'">
			<view class='pageBox zzz3' v-if="page_type_name=='成绩查询'">
				<view class='infoBox'>
					<view class='e1'>
						<view class='left_text e2'>
							<view>届</view>
							<view>数：</view>
						</view>
						<picker @change="bindPickerChange1" :range="array1">
							<view class='inputs' v-if="year">{{year}}</view>
							<view class='inputs_no' v-else>请选择届数</view>
						</picker>
					</view>
					<view class='info_line'></view>
					<!-- <view class='e1' v-if="year">
						<view class='left_text e2'>
							<view>赛</view>
							<view>事：</view>
						</view>
						<picker @change="bindPickerChange2" :range="array2" range-key="name">
							<view class='inputs' v-if="competitionname">{{competitionname}}</view>
							<view class='inputs_no' v-else>请选择赛事</view>
						</picker>
					</view> -->
					<!-- <view class='info_line' v-if="year"></view> -->
					<view class='e1'>
						<view class='left_text e2'>
							<view>名称：</view>
						</view>
						<input class='inputs' type='text' v-model='name' placeholder='请输入教师姓名或单位名称'
							placeholder-style='color:#999999' />
					</view>
					<view class='info_line'></view>
					<view class='e1'>
						<view class='left_text e2'>
							<view>证件号：</view>
						</view>
						<input class='inputs' type='text' v-model='uniid' placeholder='请输入身份证号或组织单位代码'
							placeholder-style='color:#999999' />
					</view>
					<view class='info_line'></view>
					<!-- <view class='yellowBox'>
						<view>1、查询学生成绩：请输入报名时填写的学生姓名与证件号。</view>
						<view>2、查询教师证书：首次查询请使用教师姓名和手机号码；领取电子证书后，可使用姓名 + 手机号、身份证号或证书编号中任一方式进行查询。</view>
						<view>3、查询院校证书：请输入院校在注册登录时使用的完整名称。</view>
						<view>4、如有疑问，请发送邮件到 XXX 咨询，邮件中注明教师姓名、手机号、身份证号、学校、辅导的学生等信息。</view>
					</view> -->
					<view class='button pointer' @click="goChaXun()">立即查询</view>
				</view>
			</view>

		</view>

		<view v-if="page_type_name=='查询结果'&&isType==1">
				<view class='pageBox zzz3 mb200'>
				<view class='img2Box zzz3'>
					<view class='e1'>
						<image class='imagesssss pointer'
							src='/static/local_assets/fef85503edbf82dabb254127.png'
							@click="page_type_name='成绩查询'" />
						<view class='title'>查询结果</view>
					</view>
					</view>
					<view class='listBox' v-if="!certificateVisible">
						<view class='itemList zzz3'>证书查询暂未开放</view>
					</view>
					<view class='listBox' v-if="isJiang">
					<view class='itemList zzz3' v-for='(item, index) in jieguoList' :key='index'>
						<view class='student-result-category-name'>{{item.category_name || '-'}}</view>
						<!-- 暂不展示结果摘要，仅保留赛项名称
						<view class='student-result-message'>
							<view class='student-result-name'>{{item.student_name || name}}同学：</view>
							<view>恭喜你，在 {{item.competition_name || '首届 “常青藤”全国青少年校园戏剧创意大赛'}}获得</view>
						</view>
						<view class='student-result-details'>
							<view class='student-result-row'><text>姓名</text><text>{{item.student_name || name}}</text></view>
							<view class='student-result-row'><text>赛项名称</text><text>{{item.category_name || '-'}}</text></view>
							<view class='student-result-row'><text>专业</text><text>{{item.professional_name || '-'}}</text></view>
							<view class='student-result-row'><text>作品名称</text><text>{{item.work_title || item.title || '-'}}</text></view>
							<view class='student-result-row student-result-award'><text>奖项</text><text>{{item.award_name || (item.shengaward && item.shengaward.award) || '-'}}</text></view>
						</view>
						-->
						<!-- 省定塙奖：有奖项就显示（无图时仅显示奖项名） -->
							<view class="w100b"
								v-if="shengCertificateVisible && item.shengaward && item.shengaward.image && item.shengaward.award && item.shengaward.award != '未获奖'">
							<view class='e1 mb22'>
								<view class='xiansss mr10'></view>
								<view class=' w100b text1 t-left'>复赛奖项：{{item.shengaward.award}}</view>
							</view>
							<view class='linesss'></view>
								<view class='zzz3'>
									<image :class="$isPC ?'w750 pointer bdr20':'w500 pointer bdr20'"
										:src="item.shengaward.image" mode="widthFix"
										@click="lookImg(item.shengaward.image)" />
								</view>
						</view>
						<!-- 国定塙奖：有奖项就显示 -->
							<view class="w100b mt22"
								v-if="guoCertificateVisible && item.guoaward && item.guoaward.image && item.guoaward.award && item.guoaward.award != '未获奖'">
							<view class='e1 mb22'>
								<view class='xiansss mr10'></view>
								<view class=' w100b text1 t-left'>总决赛奖项：{{item.guoaward.award}}</view>
							</view>
							<view class='linesss'></view>
								<view class='zzz3'>
									<image :class="$isPC ?'w750 pointer bdr20':'w500 pointer bdr20'"
										:src="item.guoaward.image" mode="widthFix" @click="lookImg(item.guoaward.image)" />
								</view>
						</view>
					</view>
				</view>
				<view class='listBox' v-else>
					<view class='itemList zzz3' v-for='(item, index) in jieguoList' :key='index'>
						<view class='student-result-message'>
							<view class='student-result-name' v-if="item.result_type === 'not_awarded'">{{item.student_name || name}}同学：</view>
							<view>{{item.msg}}</view>
						</view>
					</view>
				</view>
			</view>
		</view>


		<view v-if="page_type_name=='查询结果'&&isType==2">
			<view class='pageBox zzz3 mb200'>
				<view class='img2Box zzz3'>
					<view class='e1'>
						<image class='imagesssss pointer'
							src='/static/local_assets/fef85503edbf82dabb254127.png'
							@click="page_type_name='成绩查询'" />
						<view class='title'>查询结果</view>
					</view>
				</view>
				<view class='listBox' v-if="isJiang">
					<view class='itemList zzz3' v-for='(item, index) in jieguoList' :key='index'>
							<view class="w100b" v-if="item.certurl">
							<view class='e1 mb22'>
								<view class='xiansss mr10'></view>
								<view class=' w100b text1 t-left'>{{item.award_name}}</view>
							</view>
							<view class='linesss'></view>
								<view class='zzz3'>
									<image :class="$isPC ?'w750 pointer bdr20':'w500 pointer bdr20'" :src="item.certurl"
										mode="widthFix" @click="lookImg(item.certurl)" />
									<view v-if="item.type != 0" class='xiazaiTexr pointer' @click="downloadCertificate(item.certurl)">下载</view>
								</view>
						</view>
					</view>
				</view>
				<view class=' listBox' v-else>
					<view class='itemList zzz3' v-for='(item, index) in jieguoList' :key='index'>
						<view class='e2 zyjj40'>
							<view class='text1 textsl1'>{{item.msg}}</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<bottomBox pageName='成绩查询' :configData="configData"></bottomBox>
	</view>
</template>

<script>
	import topBox from '@/components/topBox.vue';
	import bottomBox from '@/components/bottomBox.vue';

	export default {
		components: {
			topBox,
			bottomBox
		},
		data() {
			return {
				configData: {},
				isType: 1,
				type1: 1,
				type2: 1,
				page_type_name: '成绩查询',
				saishiList: [],
				year: '',
				competitionid: '',
				competitionname: '',
				uniid: '',
				name: '',
				array1: ['首届'],
				array2: [],
				jieguoList: [],

				myInfo: {},
				isLogin: true,
				cjcx_id: '',
				cjcx_name: '',
				chaxunAPI: '',
				chaxunDATA: '',
				isJiang: false
			}
		},
		computed: {
			certificateVisible() {
				return this.shengCertificateVisible || this.guoCertificateVisible;
			},
			shengCertificateVisible() {
				return String(this.configData.sheng_certificate_visibility || '0') === '1';
			},
			guoCertificateVisible() {
				return String(this.configData.guo_certificate_visibility || '0') === '1';
			}
		},
		// 在 pages/index/grade.vue 的 onLoad 中
		onLoad(e) {
			this.POST({
				name: '个人信息2',
				url: '/api/auth/userinfo',
				data: {}
			}).then((res) => {
				if (res.data.code == 401) {
					this.isLogin = false
				} else {
					console.log('--已登录')
					this.isLogin = true
					this.myInfo = res.data.data
				}
			});

			// 1. 尝试读取缓存
			const cache = uni.getStorageSync('last_cjcx_type');

			if (cache && cache.id) {
				// 如果有缓存，直接使用缓存中的配置
				this.cjcx_id = cache.id;
				this.cjcx_name = cache.name;
				if (this.cjcx_name === '教师证书' || this.cjcx_name === '单位证书') {
					this.cjcx_id = 2;
					this.cjcx_name = '教师/单位证书';
					uni.setStorageSync('last_cjcx_type', { id: 2, name: this.cjcx_name });
				}
				console.log('>>> 读取缓存配置:', this.cjcx_id, this.cjcx_name);
			} else {
				// 2. 如果没有缓存（首次使用或缓存被清），使用默认值
				this.cjcx_id = 1;
				this.cjcx_name = '学生查询';
				console.log('>>> 无缓存，使用默认值');

				// 可选：初始化时也存一次默认值到缓存，避免每次进来都走 else
				// uni.setStorageSync('last_cjcx_type', { id: 1, name: '学生查询' });
			}

			// 初始化页面数据
			this.initPageData();
		},

		onShow() {
			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});
		},
		methods: {
			// 处理类型切换 (由 topBox 触发)
			handleCjcxTypeChange(data) {
				console.log('--------data', data)
				this.cjcx_id = data.id;
				this.cjcx_name = data.name;

				uni.setStorageSync('last_cjcx_type', {
					id: this.cjcx_id,
					name: this.cjcx_name
				});

				// 重置表单
				this.year = '';
				this.competitionid = '';
				this.competitionname = '';
				this.uniid = '';
				this.name = '';
				this.array2 = [];
				this.page_type_name = '成绩查询';

				// 重新加载赛事列表如果需要
				this.initPageData();
			},

			initPageData() {
				if (this.year) {
					this.getCompetitionlist();
				}
			},
			getCompetitionlist() {
				this.POST({
					name: '获取赛事',
					url: '/api/product/Competitionlist',
					data: {
						year: this.getYear(this.year),
					}
				}).then((res) => {
					this.array2 = res.data.data || [];
				}).catch((error) => {
					console.error('赛事列表加载失败:', error);
				});
			},
			bindPickerChange1: function(e) {
				this.year = this.array1[e.detail.value]
				this.getCompetitionlist()
			},
			bindPickerChange2: function(e) {
				if (this.array2 && this.array2[e.detail.value]) {
					this.competitionid = this.array2[e.detail.value].id
					this.competitionname = this.array2[e.detail.value].name
				}
			},

			downloadCertificate(url) {
				if (url) {
					window.open(url, '_blank');
				} else {
					uni.showToast({
						title: '下载链接未配置',
						icon: 'none'
					});
				}
			},

			goChaXun() {
				if (!this.year) {
					uni.showToast({
						title: '请选择届数',
						icon: 'none'
					});
					return;
				}
				if (!this.name) {
					uni.showToast({
						title: '请输入姓名',
						icon: 'none'
					});
					return;
				}
				if (!this.uniid) {
					uni.showToast({
							title: '请输入证件号',
						icon: 'none'
					});
					return;
				}

				if (this.cjcx_name == '学生查询') {
					this.chaxunAPI = '/api/product/view-grades'
					this.chaxunDATA = {
						year: this.getYear(this.year),
						competitionid: this.competitionid,
						uniid: this.uniid,
						name: this.name,
						type: this.cjcx_id
					}
				}
				if (this.cjcx_name == '教师/单位证书') {
					this.chaxunAPI = '/api/competition/certificate'
					this.chaxunDATA = {
						year: this.getYear(this.year),
						competitionid: this.competitionid,
						idcard: this.uniid,
						name: this.name,
						combined: 1
					}
				}

				this.POST({
					name: '成绩查询',
					url: this.chaxunAPI,
					data: this.chaxunDATA
				}).then((res) => {
					this.jieguoList = res.data.data || []
					if (this.jieguoList.length === 0) {
						uni.showToast({
							title: '未查询到相关记录',
							icon: 'none',
							duration: 2000
						});
						return
					}
					if (this.jieguoList[0].msg) {
						this.isJiang = false
					} else {
						this.isJiang = true
					}
					if (this.cjcx_name == '学生查询') {
						this.isType = 1
					} else {
						this.isType = 2
					}
					console.log('---------this.jieguoList', this.jieguoList)
					this.page_type_name = '查询结果'
					this.$nextTick(() => {
						uni.pageScrollTo({
							scrollTop: 0,
							duration: 300
						});
					});
				}).catch((error) => {
					console.error('成绩查询失败:', error);
				});
			},
			getYear(e) {
				if (e == '首届') return 1
				if (e == '第二届') return 2
				if (e == '第三届') return 3
				return 1;
			},
		}
	}
</script>

<style lang="scss" scoped>
	page {
		background: #F5F5F5;
	}

	/*  电脑端样式 */
	@media (min-width: 769px) {
		.pageBox {
			width: 100vw;

			.img2Box {
				position: relative;
				width: 100vw;
				height: 15.16vw;
				background-image: url('/static/local_assets/aafba25afc6f4077bd841f73.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;
				margin-top: -1.25vw;

				.imagesssss {
					width: 2.3vw;
					height: 2.3vw;
					margin-right: 1vw;
					cursor: pointer;
				}

				.title {
					width: 62.5vw;
					max-width: 3400rpx;
					font-weight: bold;
					font-size: 2.08vw;
					color: #FFFFFF;
					text-align: left;
				}
			}

			.xiazaiTexr {
				width: 10vw;
				height: 3vw;
				background: #f00;
				border-radius: 10rpx;
				font-weight: 600;
				font-size: 1.2vw;
				color: #FFFFFF;
				line-height: 3vw;
				text-align: center;
				margin-top: 1vw;
			}

			.listBox {
				width: 62.50vw;
				max-width: 3400rpx;
				margin-top: -3vw;
				margin-bottom: 12vw;
				z-index: 229;

				.xiansss {
					background-color: #f00;
					width: 0.2vw;
					height: 1vw;
				}

				.linesss {
					width: 100%;
					height: 1rpx;
					background-color: #e5e5e5;
					margin-bottom: 0.6vw;
				}

				.itemList {
					width: 100%;
					padding: 1.41vw 2.71vw 1.41vw 1.56vw;
					box-sizing: border-box;
					background: #FFFFFF;
					box-shadow: 0px 21px 104px 0px rgba(153, 153, 153, 0.19);
					border-radius: 26rpx;
					margin-bottom: 1.56vw;

					.text1 {
						font-weight: bold;
						font-size: 0.80vw;
						color: #1F1F1F;
					}


					.text2 {
						font-weight: 900;
						font-size: 1.63vw;
						color: #ff0000;
					}

					.text3 {
						width: 100%;
						margin-top: 1vw;
						font-size: 1.28vw;
						color: #1F1F1F;
					}

					.text4 {
						font-size: 1vw;
						color: #767676;
					}
				}
			}

			.infoBox {
				width: 62.50vw;
				max-width: 3400rpx;
				padding: 4.69vw 5.21vw 1.44vw 5.21vw;
				box-sizing: border-box;
				background: #FFFFFF;
				border-radius: 50rpx;
				margin-top: -3vw;
				margin-bottom: 6.2vw;
				z-index: 229;

				.left_text {
					width: 5.21vw;
					font-weight: 500;
					font-size: 1.04vw;
					color: #1F1F1F;
					text-align: left;
				}

				.inputs {
					width: 40vw;
					font-size: 1.04vw;
					color: #1F1F1F;
				}

				.inputs_no {
					width: 40vw;
					font-size: 1.04vw;
					color: #999999;
				}

				.info_line {
					width: 100%;
					height: 2px;
					background-color: #EEEEEE;
					margin: 1.56vw 0;
				}

				.yellowBox {
					width: 100%;
					background: #FFF9E8;
					padding: 0.99vw 1.41vw;
					box-sizing: border-box;
					font-weight: 500;
					font-size: 0.73vw;
					color: #C27509;
					margin-bottom: 1.93vw;
				}

				.button {
					width: 100%;
					height: 3.13vw;
					background: #E62402;
					border-radius: 20rpx;
					font-weight: bold;
					font-size: 1.04vw;
					color: #FFFFFF;
					text-align: center;
					line-height: 3.13vw;
					cursor: pointer;
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {

		.pageBox {
			width: 100vw;

			.img2Box {
				position: relative;
				width: 100vw;
				height: 500rpx;
				background-image: url('/static/local_assets/aafba25afc6f4077bd841f73.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;
				margin-top: 0rpx;

				.imagesssss {
					width: 40rpx;
					height: 40rpx;
					margin-right: 10rpx;
					cursor: pointer;
				}

				.title {
					width: 700rpx;
					font-weight: bold;
					font-size: 46rpx;
					color: #FFFFFF;
					text-align: left;
				}
			}

			.xiazaiTexr {
				width: 220rpx;
				height: 88rpx;
				background: #f00;
				border-radius: 10rpx;
				font-weight: 600;
				font-size: 28rpx;
				color: #FFFFFF;
				line-height: 88rpx;
				text-align: center;
				margin-top: 20rpx;
			}

			.listBox {
				width: 700rpx;
				margin-top: -200rpx;
				z-index: 229;

				.xiansss {
					background-color: #f00;
					width: 6rpx;
					height: 40rpx;
				}

				.linesss {
					width: 100%;
					height: 1rpx;
					background-color: #e5e5e5;
					margin-bottom: 20rpx;
				}

				.itemList {
					width: 100%;
					padding: 12rpx;
					box-sizing: border-box;
					background: #FFFFFF;
					box-shadow: 0px 21px 104rpx 0px rgba(153, 153, 153, 0.19);
					border-radius: 10rpx;
					margin-bottom: 10rpx;

					.text1 {
						font-weight: bold;
						font-size: 28rpx;
						color: #1F1F1F;
					}

					.text2 {
						font-weight: 400;
						font-size: 28rpx;
						color: #999999;
					}

					.text4 {
						font-weight: 400;
						font-size: 24rpx;
						color: #999999;
					}
				}
			}

			.infoBox {
				width: 700rpx;
				padding: 24rpx;
				box-sizing: border-box;
				background: #FFFFFF;
				border-radius: 10rpx;
				margin-top: -30rpx;
				margin-bottom: 50rpx;
				z-index: 229;

				.left_text {
					width: 160rpx;
					font-weight: 500;
					font-size: 32rpx;
					color: #1F1F1F;
					text-align: left;
				}

				.inputs {
					width: 400rpx;
					font-size: 32rpx;
					color: #1F1F1F;
				}

				.inputs_no {
					width: 400rpx;
					font-size: 32rpx;
					color: #999999;
				}

				.info_line {
					width: 100%;
					height: 2px;
					background-color: #EEEEEE;
					margin: 20rpx 0;
				}

				.yellowBox {
					width: 100%;
					background: #FFF9E8;
					padding: 24rpx;
					box-sizing: border-box;
					font-weight: 500;
					font-size: 24rpx;
					color: #C27509;
					margin-bottom: 30rpx;
				}

				.button {
					width: 100%;
					height: 90rpx;
					background: #E62402;
					border-radius: 20rpx;
					font-weight: bold;
					font-size: 30rpx;
					color: #FFFFFF;
					text-align: center;
					line-height: 90rpx;
					cursor: pointer;
				}
			}
		}
	}

	.app_imgBox {
		padding-top: 6.25vw; // PC 占位

		@media (max-width: 768px) {
			padding-top: 100rpx;
		}

		.title {
			text-align: center;
			font-weight: bold;
			font-size: 4vw;
			margin-bottom: 2vw;

			@media (max-width: 768px) {
				font-size: 36rpx;
			}
		}
	}

	.asaas {
		font-size: 30px;
		margin: 200rpx 0;
	}

	.student-result-message {
		font-size: 30rpx;
		line-height: 1.9;
		color: #333333;
		padding: 12rpx 0 30rpx;
	}

	.student-result-category-name {
		padding: 12rpx 0 30rpx;
		text-align: center;
		color: #1f1f1f;
		font-size: 36rpx;
		font-weight: 600;
		line-height: 1.6;
	}

	.student-result-name {
		font-size: 34rpx;
		font-weight: 600;
		color: #1f1f1f;
		margin-bottom: 8rpx;
	}

	.student-result-details {
		border-top: 1px solid #eeeeee;
	}

	.student-result-row {
		display: flex;
		align-items: flex-start;
		gap: 24rpx;
		padding: 22rpx 0;
		border-bottom: 1px solid #eeeeee;
		font-size: 28rpx;
		color: #333333;

		text:first-child {
			width: 140rpx;
			flex-shrink: 0;
			color: #777777;
		}
	}

	.student-result-award text:last-child {
		font-size: 32rpx;
		font-weight: 600;
		color: #e62402;
	}
</style>
