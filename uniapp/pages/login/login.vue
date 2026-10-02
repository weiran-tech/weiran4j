<template>
	<view>
		<view class='pageBox zzz3'>
			<image class='bj-box' src='/static/local_assets/3376a883735f0d5b153f41d7.png' />
			<view class='loginBox zzz2'>
				<view :class="$isPC?'e2 w100b':'w100b'">
					<view :class="$isPC?'zzz3':'e2 mb100'">
						<image class='logo pointer'
							src='/static/local_assets/group-logo.png'
							mode="widthFix" @click="reLaunch('/pages/index/index')" />
						<view class='zzz3'>
							<image class='ewmImg pointer' :src="configData.gongzhonghao?.[0] || ''" mode="aspectFill"
								style="object-fit: cover" @click="lookImg(configData.gongzhonghao?.[0])" />
							<view class='text'>关注大赛公众号</view>
						</view>
					</view>

					<view class='goBox zzz3'>
						<!-- ================= 登录模式 ================= -->
						<view v-if="!showForget" class="zzz3">
							<view class='title1'>欢迎登录{{is_school==1?'学校':'学生'}}大赛报名 平台</view>

							<!-- 手机号 -->
							<view class='inputsBox zzz3'>
								<view class='e1 inputBox'>
									<image class='images'
										src='/static/local_assets/3e313efec7778eb9c29df774.png' />
									<input class='input' type='number' v-model='tel' placeholder='输入手机号'
										placeholder-style='color:#999999' />
								</view>
							</view>

							<!-- 验证码 -->
							<view class='inputsBox zzz3'>
								<view class='e2 inputBox'>
									<input class='input code-input' type='number' v-model='code' placeholder='输入手机验证码'
										placeholder-style='color:#999999' maxlength="6" />
									<view class='pointer texts' :class="{ 'text-disable': isSending }"
										@click="sendCode">
										{{ isSending ? countdown + 's 后重发' : '发送验证码' }}
									</view>
								</view>
							</view>

							<!-- 新增：密码输入框 (登录用) -->
							<view class='inputsBox zzz3'>
								<view class='e1 inputBox'>
									<image class='images'
										src='/static/local_assets/33f6e68b23c81dc261f90f88.png'
										mode="widthFix" style="width: 40rpx;" />
									<input class='input' :type="isMing1?'text':'password'" v-model='password'
										placeholder='输入登录密码' placeholder-style='color:#999999' />
									<image class='kanyubukan pointer'
										src='/static/local_assets/d939602dc8b6d2d08fa8a1e1.png'
										v-if="isMing1==0" @click="isMing1=1" />
									<image class='kanyubukan pointer'
										src='/static/local_assets/fc8bfaadb36b87e9738e7bd7.png'
										v-if="isMing1==1" @click="isMing1=0" />
								</view>
							</view>

							<!-- 协议勾选 -->
							<view class='titles e1 w100b'>
								<image class="pointer"
									src='/static/local_assets/f5781ebba6ba4715e8294f13.png'
									v-if='isXuan==false' @click='isXuan=true' />
								<image class="pointer"
									src='/static/local_assets/4c13961eb4a95d2e91bf44b8.png'
									v-if='isXuan==true' @click='isXuan=false' />
								<view class=''>
									<view class="text">点击同意并接受即表示您已阅读了解并同意<span class="pointer"
											@click="lookXieYi('用户协议')"
											style='color: #000;text-decoration: underline;'>《用户协议》</span></view>
								</view>
							</view>

							<!-- 登录按钮 -->
							<image class='dlan pointer'
								src='/static/local_assets/c46ece9da360afafea134ee6.png'
								mode="widthFix" @click="goLogin" />

							<!-- 底部链接 -->
							<view class='title2 w100b'>
								<view style="display: flex; justify-content: space-between; align-items: center;">
									<view class="pointer" @click="goRegister" style="color: #f00;">没有账号？去注册</view>
									<view class="pointer" style='color: #666; font-size: 32rpx;'
										@click="toggleMode(true)">忘记密码？</view>
								</view>
							</view>
						</view>

						<!-- ================= 忘记密码模式 ================= -->
						<view class='zzz3' v-else>
							<view class='title1'>找回密码</view>
							<view class='text' style="font-size: 24rpx; color: #666; margin-bottom: 20rpx;">
								请输入手机号、验证码及新密码</view>

							<!-- 手机号 -->
							<view class='inputsBox zzz3'>
								<view class='e1 inputBox'>
									<image class='images'
										src='/static/local_assets/3e313efec7778eb9c29df774.png' />
									<input class='input' type='number' v-model='tel' placeholder='输入手机号'
										placeholder-style='color:#999999' />
								</view>
							</view>

							<!-- 验证码 -->
							<view class='inputsBox zzz3'>
								<view class='e2 inputBox'>
									<input class='input code-input' type='number' v-model='code' placeholder='输入手机验证码'
										placeholder-style='color:#999999' maxlength="6" />
									<view class='pointer texts' :class="{ 'text-disable': isSending }"
										@click="sendCode">
										{{ isSending ? countdown + 's 后重发' : '发送验证码' }}
									</view>
								</view>
							</view>

							<!-- 新密码 -->
							<view class='inputsBox zzz3'>
								<view class='e1 inputBox'>
									<image class='images'
										src='/static/local_assets/33f6e68b23c81dc261f90f88.png'
										mode="widthFix" style="width: 40rpx;" />
									<input class='input' :type="isMing2?'text':'password'" v-model='password'
										placeholder='设置新密码' placeholder-style='color:#999999' />
									<image class='kanyubukan pointer'
										src='/static/local_assets/d939602dc8b6d2d08fa8a1e1.png'
										v-if="isMing2==0" @click="isMing2=1" />
									<image class='kanyubukan pointer'
										src='/static/local_assets/fc8bfaadb36b87e9738e7bd7.png'
										v-if="isMing2==1" @click="isMing2=0" />
								</view>
							</view>

							<!-- 确认密码 -->
							<view class='inputsBox zzz3'>
								<view class='e1 inputBox'>
									<image class='images'
										src='/static/local_assets/33f6e68b23c81dc261f90f88.png'
										mode="widthFix" style="width: 40rpx;" />
									<input class='input' :type="isMing3?'text':'password'" v-model='confirmPassword'
										placeholder='确认新密码' placeholder-style='color:#999999' />
									<image class='kanyubukan pointer'
										src='/static/local_assets/d939602dc8b6d2d08fa8a1e1.png'
										v-if="isMing3==0" @click="isMing3=1" />
									<image class='kanyubukan pointer'
										src='/static/local_assets/fc8bfaadb36b87e9738e7bd7.png'
										v-if="isMing3==1" @click="isMing3=0" />
								</view>
							</view>

							<!-- 重置密码按钮 (复用登录按钮图片，或可更换) -->
							<image class='dlan pointer'
								src='/static/local_assets/c46ece9da360afafea134ee6.png'
								mode="widthFix" @click="goReset" />

							<!-- 返回登录 -->
							<view class='title2' style="text-align: center;">
								<view class="pointer" style='color: #E62402' @click="toggleMode(false)">返回登录</view>
							</view>
						</view>

					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isXuan: false,
				tel: '',
				code: '',
				password: '', // 登录密码 / 新密码
				confirmPassword: '', // 确认新密码
				is_school: 1,

				// 模式切换
				showForget: false, // false: 登录模式，true: 忘记密码模式

				// 验证码相关状态
				isSending: false,
				countdown: 60,
				timer: null,

				isMing1: 0,
				isMing2: 0,
				isMing3: 0,

				configData: {}
			}
		},
		computed: {},
		onLoad(e) {
			this.is_school = e.is_school || 1
		},
		onShow() {
			this.getTabber(this.$isPC)
			this.getConfig()
		},
		onUnload() {
			if (this.timer) {
				clearInterval(this.timer);
				this.timer = null;
			}
		},
		methods: {
			goRegister() {
				console.log('触发了触发了触发了触发了触发了触发了触发了触发了触发了')
				uni.navigateTo({
					url: '/pages/login/register'
				});
			},
			// 切换模式
			toggleMode(isForget) {
				this.showForget = isForget
				this.isXuan = false
				this.tel = ''
				this.code = ''
				this.password = ''
				this.confirmPassword = ''
				this.is_school = 1
				this.isSending = false
				this.countdown = 60
				this.timer = null
				if (!isForget) {
					this.password = ''
					this.confirmPassword = ''
				} else {
					this.password = ''
					this.confirmPassword = ''
					this.code = ''
				}
			},

			getConfig() {
				this.GET({
					name: '获取网站配置',
					url: '/api/product/getconfig',
					data: {}
				}).then((res) => {
					this.configData = res.data.data
				});
			},

			sendCode() {
				if (this.isSending) return;

				const phoneReg = /^1[3-9]\d{9}$/;
				if (!this.tel) {
					this.showToast('请输入手机号');
					return;
				}
				if (!phoneReg.test(this.tel)) {
					this.showToast('手机号格式不正确');
					return;
				}

				// 根据模式不同，type可以不同，这里假设 1=登录/注册，2=找回密码，具体看后端定义
				// 如果后端不区分，保持 type: 1 即可
				const type = this.showForget ? 2 : 1;

				this.GET({
					name: '发送验证码',
					url: '/api/auth/sendSms',
					data: {
						phone: this.tel,
						type: type
					}
				}).then((res) => {
					if (res.data.code === 200 || res.data.code === 0) {
						this.showToast('验证码已发送');
						this.startTimer();
					} else {
						this.showToast(res.data.msg || '发送失败');
					}
				}).catch((err) => {
					console.log(err);
					// 测试环境模拟
					// this.showToast('模拟发送成功');
					// this.startTimer();
					this.showToast('网络错误或接口未配置');
				});
			},

			startTimer() {
				this.isSending = true;
				this.countdown = 60;
				if (this.timer) clearInterval(this.timer);
				this.timer = setInterval(() => {
					this.countdown--;
					if (this.countdown <= 0) {
						clearInterval(this.timer);
						this.timer = null;
						this.isSending = false;
						this.countdown = 60;
					}
				}, 1000);
			},

			// 登录逻辑
			goLogin() {
				if (this.isXuan == false) {
					this.showToast('请阅读并同意《用户协议》')
					return
				}
				if (!this.tel || !this.password || !this.code) {
					this.showToast('请填写完整登录信息');
					return;
				}

				this.POST({
					name: '学生登录',
					url: '/api/auth/login',
					data: {
						type: 1,
						phone: this.tel,
						password: this.password,
						code: this.code,
					}
				}).then((res) => {
					uni.showToast({
						title: '登录成功',
						icon: "success"
					})
					uni.setStorageSync('loginInfo', res.data.data)

					this.POST({
						name: '个人信息2',
						url: '/api/auth/userinfo',
						data: {}
					}).then((res2) => {
						setTimeout(() => {
							uni.switchTab({
								url: '/pages/my/my?index=0'
							})
						}, 1000)
					});
				});
			},

			// 重置密码逻辑
			goReset() {
				// 1. 基础校验
				if (!this.tel) {
					this.showToast('请输入手机号');
					return;
				}
				if (!this.code) {
					this.showToast('请输入验证码');
					return;
				}
				if (!this.password) {
					this.showToast('请输入新密码');
					return;
				}
				if (!this.confirmPassword) {
					this.showToast('请确认新密码');
					return;
				}
				if (this.password !== this.confirmPassword) {
					this.showToast('两次输入的密码不一致');
					return;
				}

				// 2. 调用接口
				this.POST({
					name: '找回密码',
					url: '/api/auth/resetPassword',
					data: {
						phone: this.tel,
						code: this.code,
						password: this.password,
						password_confirmation: this.confirmPassword
					}
				}).then((res) => {
					if (res.data.code === 200 || res.data.code === 0) {
						uni.showToast({
							title: '密码重置成功，请登录',
							icon: "success",
							duration: 2000
						})
						// 成功后自动切回登录页
						setTimeout(() => {
							this.toggleMode(false);
							this.password = '';
							this.confirmPassword = '';
							this.code = '';
						}, 2000);
					} else {
						uni.showToast({
							title: res.data.msg || '重置失败',
							icon: "none"
						})
					}
				}).catch((err) => {
					this.showToast('网络错误');
				});
			}
		}
	}
</script>

<style lang="scss" scoped>
	page {
		background-color: #e52402;
	}

	/*  电脑端样式 */
	@media (min-width: 769px) {
		.pageBox {
			position: relative;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;

			.bj-box {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				z-index: 10;
			}

			.loginBox {
				width: 58.54vw;
				max-width: 3000rpx;
				height: 100vh;
				z-index: 100;

				.logo {
					width: 12.90vw;
				}

				.ewmImg {
					width: 13.54vw;
					height: 13.54vw;
					margin-top: 3.65vw;
					margin-bottom: 2.19vw;
					border-radius: 10rpx;
				}

				.text {
					font-weight: 500;
					font-size: 1.25vw;
					color: #FFFFFF;
				}

				.goBox {
					background: rgba(255, 255, 255, 0.97);
					box-shadow: 0px 104 104px 0px rgba(141, 11, 11, 0.4);
					border-radius: 26rpx;
					padding: 2.5vw 1.6vw 1.36vw 1.6vw;
					box-sizing: border-box;

					.title1 {
						font-weight: 500;
						font-size: 1.25vw;
						color: #1F1F1F;
						margin-bottom: 1vw;
					}

					.title2 {
						font-size: 0.73vw;
						color: #333333;
						margin-top: 1.5vw;
					}

					.inputsBox {
						width: 19.48vw;
						height: 3.02vw;
						background: #F5F5F5;
						border-radius: 16rpx;
						margin-top: 1.2vw;
						display: flex;
						align-items: center;

						.inputBox {
							width: 100%;
							height: 100%;
							display: flex;
							align-items: center;
							justify-content: space-between;
							padding: 0 0.5vw;
							box-sizing: border-box;

							.images {
								width: 1vw;
								height: 1vw;
								margin-right: 0.5vw;
								flex-shrink: 0;
							}

							.input {
								flex: 1;
								font-weight: 500;
								font-size: 0.83vw;
								color: #333;
								height: 100%;
							}

							.code-input {
								flex: 0 0 auto;
								width: 8vw;
							}

							.texts {
								font-weight: 500;
								font-size: 0.83vw;
								color: #E62402;
								white-space: nowrap;
								margin-left: 0.5vw;

								&.text-disable {
									color: #999999;
									cursor: not-allowed;
								}
							}
						}

						.kanyubukan {
							width: 1.2vw;
							height: 1.2vw;
							margin-left: 1vw;
						}
					}

					.titles {
						margin-top: 1.5vw;

						image {
							width: 1vw;
							height: 1vw;
							margin-right: 0.26vw;
						}

						.text {
							font-weight: 400;
							font-size: 0.63vw;
							color: #999999;
							line-height: 1vw;
						}
					}

					.dlan {
						width: 15.42vw;
						margin-top: 1.5vw;
						margin-bottom: 0.2vw;
					}
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.pageBox {
			position: relative;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;

			.bj-box {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				z-index: 10;
			}

			.loginBox {
				width: 700rpx;
				z-index: 100;

				.logo {
					width: 310rpx;
				}

				.ewmImg {
					width: 150rpx;
					height: 150rpx;
					border-radius: 10rpx;
				}

				.text {
					font-weight: 500;
					font-size: 24rpx;
					color: #FFFFFF;
				}

				.goBox {
					background: #FFFFFF;
					box-shadow: 0px 104 104rpx 0rpx rgba(141, 11, 11, 0.4);
					border-radius: 26rpx;
					padding: 24rpx;
					box-sizing: border-box;
					margin-bottom: 400rpx;
					min-height: 800rpx;
					/* 防止切换时高度跳动 */

					.title1 {
						font-weight: 500;
						font-size: 32rpx;
						color: #1F1F1F;
						margin-bottom: 10rpx;
					}

					.title2 {
						font-size: 28rpx;
						color: #333333;
						margin-top: 20rpx;
					}

					.inputsBox {
						width: 100%;
						height: 80rpx;
						background: #F5F5F5;
						border-radius: 16rpx;
						margin-top: 20rpx;
						display: flex;
						align-items: center;

						.inputBox {
							width: 100%;
							height: 100%;
							display: flex;
							align-items: center;
							justify-content: space-between;
							padding: 0 20rpx;
							box-sizing: border-box;

							.images {
								width: 40rpx;
								height: 40rpx;
								margin-right: 20rpx;
								flex-shrink: 0;
							}

							.input {
								flex: 1;
								font-weight: 500;
								font-size: 28rpx;
								color: #333;
								height: 100%;
							}

							.code-input {
								flex: 0 0 auto;
								width: 240rpx;
							}

							.texts {
								font-weight: 500;
								font-size: 26rpx;
								color: #E62402;
								white-space: nowrap;
								margin-left: 10rpx;

								&.text-disable {
									color: #999999;
									cursor: not-allowed;
								}
							}
						}

						.kanyubukan {
							width: 40rpx;
							height: 40rpx;
							margin-left: 10rpx;
						}
					}

					.titles {
						margin-top: 20rpx;

						image {
							width: 40rpx;
							height: 40rpx;
							margin-right: 4rpx;
						}

						.text {
							font-weight: 400;
							font-size: 22rpx;
							color: #999999;
							line-height: 50rpx;
						}
					}

					.dlan {
						width: 340rpx;
						margin-top: 30rpx;
						margin-bottom: 2rpx;
					}
				}
			}
		}
	}
</style>
