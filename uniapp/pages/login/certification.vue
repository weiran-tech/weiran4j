<template>
	<view>
		<topBox pageName='' :myInfo='myInfo'></topBox>
		<view class='pageBox zzz3'>
			<view class='img2Box zzz3'>
				<view class='title'>
					学校认证
				</view>
			</view>
			<view class='listBox'>
				<view class='inputs_all'>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">学校名称</span></view>
						<view class='long_box zzz2'>
							<input class='input' type='text' v-model='name' placeholder='请输入学校名称'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">负责人</span></view>
						<view class='long_box zzz2'>
							<input class='input' type='text' v-model='ren' placeholder='请输入负责人'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">联系方式</span></view>
						<view class='long_box zzz2'>
							<input class='input' type='text' v-model='tel' placeholder='请输入联系方式'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<view class='e1'>
						<view class='leftText'>*<span style="color: #1F1F1F">单位地址</span></view>
						<view class='long_box zzz2'>
							<input class='input' type='text' v-model='address' placeholder='请输入单位地址'
								placeholder-style='color:#999999' />
						</view>
					</view>
					<view class='e1'>
						<view class='leftText marginBottom'>*<span style="color: #1F1F1F">参赛承诺书</span></view>
						<image class='add_img pointer'
							src='/static/local_assets/2f558ac9233fcc96d20c4d6e.png' />
						<view class=''>
							<view class='e1 pointer'>
								<image class='icon'
									src='/static/local_assets/eb8804991b81c74fbcd1e033.png' />
								<view class='texts1'>点击承诺书模版下载.pdf</view>
							</view>
							<view class='texts2'>注：需加盖公章</view>
						</view>
					</view>
					<view class='e1'>
						<view class='leftText marginBottom'>*<span style="color: #1F1F1F">法人登记证书/办学许可资质</span></view>
						<image class='add_img pointer'
							src='/static/local_assets/2f558ac9233fcc96d20c4d6e.png' />
					</view>
				</view>
				<view class='button pointer' @click="queren">确定</view>
				<view class='biaozhu'>注：请确保所填写的所有信息真实、准确</view>
			</view>
		</view>
		<bottomBox pageName='' :configData="configData"></bottomBox>
	</view>
</template>

<script>
	import topBox from '@/components/topBox.vue';
	import bottomBox from '@/components/bottomBox.vue';
	import pickerAddress from '../../wangding-pickerAddress/wangding-pickerAddress2.vue'
	export default {
		components: {
			topBox,
			bottomBox,
			pickerAddress
		},
		data() {
			return {
				configData: {},
				isXuan: false,
				name: '',
				ren: '',
				tel: '',
				address: '',
				myInfo: {},
				isLogin: true,
			}
		},
		onLoad(e) {
			this.type = e.type

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
		},
		onShow() {
			this.getTabber(this.$isPC)

			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});
		},
		methods: {
			change_area(data) {
				console.log('data', data)
				this.info_city = data.data.join('-')
			},
			queren() {
				uni.navigateTo({
					url: '/pages/login/certification'
				})
			}
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
				background-image: url('/static/local_assets/16edf6178972bdaf37e37020.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;
				margin-top: 6.25vw;

				.title {
					width: 62.5vw;
					max-width: 3400rpx;
					font-weight: bold;
					font-size: 2.08vw;
					color: #FFFFFF;
					text-align: left;
					margin-bottom: 5vw;
				}

				.ziBox {
					position: relative;
					width: 3.65vw;
					height: 1.67vw;
					margin-left: 0.36vw;

					.image {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 1.67vw;
					}

					.text {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 1.67vw;
						font-weight: bold;
						font-size: 1.04vw;
						color: #FFFFFF;
						line-height: 1.67vw;
						text-align: center;
					}

				}
			}

			.listBox {
				width: 62.50vw;
				max-width: 3400rpx;
				margin-top: -7vw;
				margin-bottom: 2.66vw;
				z-index: 229;
				background-color: #FFFFFF;
				border-radius: 20rpx;
				padding: 2.6vw 10vw 3.39vw 7.97vw;
				box-sizing: border-box;

				.inputs_all {
					display: flex;
					flex-direction: column;
					gap: 1.56vw;
					margin-bottom: 2.29vw;

					.leftText {
						width: 5.73vw;
						font-weight: 500;
						font-size: 0.83vw;
						color: #E62402;
						text-align: right;
						margin-right: 1.6vw;
					}

					.marginBottom {
						margin-bottom: 5.4vw;
					}

					.add_img {
						width: 8.33vw;
						height: 8.33vw;
						margin-right: 1.82vw;
					}

					.icon {
						width: 1vw;
						height: 1vw;
						margin-right: 0.52vw;
					}

					.texts1 {
						font-weight: 500;
						font-size: 0.83vw;
						color: #1F1F1F;
					}

					.texts2 {
						font-weight: 500;
						font-size: 0.83vw;
						color: #E8A664;
						margin-top: 0.83vw;
					}

					.long_box {
						width: 21.56vw;
						height: 2.60vw;
						background: #F5F5F5;
						border-radius: 10rpx;
						padding: 0 0.52vw;
						box-sizing: border-box;

						.input {
							width: 16vw;
							font-weight: 500;
							font-size: 0.83vw;
							color: #333;
						}
					}
				}

				.button {
					width: 22.19vw;
					height: 3.02vw;
					background: #E62402;
					border-radius: 14rpx;
					font-weight: 500;
					font-size: 1.04vw;
					color: #FFFFFF;
					text-align: center;
					line-height: 3.02vw;
					margin-left: 7vw;
					margin-top: 4.4vw;
					margin-bottom: 1.8vw;
				}

				.biaozhu {
					font-weight: 500;
					font-size: 0.83vw;
					color: #999999;
					margin-left: 7vw;
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.pageBox {
			width: 100%;
		}
	}
</style>