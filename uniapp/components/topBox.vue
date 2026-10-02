<template>
	<view>
		<view class='topBox zzz3'>
			<view class='view_3l8i' :class="$isPC?'e2':'zzz3'">
				<image class="logo pointer"
					src='/static/local_assets/7f3984efad9ddfa44fab3ceb.png'
					mode="widthFix" @click="reLaunch('/pages/index/index')" v-if='$isPC' />
				<view class='e2 w100b' v-else>
					<image class="logo pointer"
						src='/static/local_assets/7f3984efad9ddfa44fab3ceb.png'
						mode="widthFix" @click="reLaunch('/pages/index/index')" />
					<image class='wh60' src='/static/local_assets/c145153c053bbcb5dd7be38e.png'
						@click="openCanDan" />
				</view>
				<view class="e1" v-if="$isPC">
					<view class='view_bfa3 e1'>
						<view class='zzz3' @click="goPage('首页')">
							<view :class="pageName=='首页'?'text_true':'text_false'">首页</view>
							<view :class="pageName=='首页'?'line_true':'line_false'"></view>
						</view>
						<view class='zzz3' @click="goPage('关于大赛')">
							<view :class="pageName=='关于大赛'?'text_true':'text_false'">关于大赛</view>
							<view :class="pageName=='关于大赛'?'line_true':'line_false'"></view>
						</view>
						<view class='zzz3' @click="goPage('大赛动态')">
							<view :class="pageName=='大赛动态'?'text_true':'text_false'">大赛动态</view>
							<view :class="pageName=='大赛动态'?'line_true':'line_false'"></view>
						</view>
						<view class='zzz3' @click="goPage('佳作展示')">
							<view :class="pageName=='佳作展示'?'text_true':'text_false'">佳作展示</view>
							<view :class="pageName=='佳作展示'?'line_true':'line_false'"></view>
						</view>
						<view class='zzz3 cjcx-dropdown' @mouseenter="handleCjcxMouseEnter"
							@mouseleave="handleCjcxMouseLeave" @click="toggleCjcxDropdown">
							<view class='cjcx-trigger e1'>
								<view class='e1'>
									<view :class="pageName=='成绩查询'?'text_true':'text_false'">
										成绩查询
									</view>
									<image class="dropdown-arrow ml10 mb4" :class="{rotate: isCjcxDropdownOpen}"
										src="/static/local_assets/b89b7d4fb8530f064008b2a0.png" />
								</view>
								<view :class="pageName=='成绩查询'?'line_true':'line_false'"></view>
							</view>
							<view class="cjcx-dropdown-menu" :class="{show: isCjcxDropdownOpen}">
								<view v-for="(item, index) in pagesList" :key="index" class="cjcx-dropdown-item"
									:class="{active: item.id == cjcxId}" @click.stop="selectCjcxType(item)">
									{{item.name}}
								</view>
							</view>
						</view>
						<view class='zzz3' @click="goPage('个人中心')">
							<view :class="pageName=='个人中心'?'text_true':'text_false'">个人中心</view>
							<view :class="pageName=='个人中心'?'line_true':'line_false'"></view>
						</view>
					</view>
					<view class='kongggg'></view>
					<view v-if='$isPC'>
						<view class='e1 pointer' v-if="myInfo&&myInfo.phone" @click="goGrzx">
							<image class='tx-img pointer'
								src='/static/local_assets/707cd197a8fe332341e45e2f.png'
								v-if="myInfo.type==1" mode="aspectFill" style="object-fit: cover" />
							<image class='tx-img pointer'
								src='/static/local_assets/1106410218aec2651a995b77.png'
								v-if="myInfo.type==2" mode="aspectFill" style="object-fit: cover" />
							<view class='text1'>{{maskString(myInfo.phone)}}</view>
						</view>
						<view class='e1' v-else>
							<view class='view_d4g5 zzz3 bod_left' style="background-color: #E8A664;"
								@click="gotoLogin(1)">
								<view class='e1'>
									<image
										src='/static/local_assets/ff1979846e4dcba92ce54f05.png' />
									<text>学校登录</text>
								</view>
							</view>
							<view class='view_d4g5 zzz3 bod_right' style="background-color: #FFFFFF;"
								@click="gotoLogin(0)">
								<view class='e1'>
									<image src='/static/local_assets/6e64d659266b77033b15d22d.png' />
									<text>学生登录</text>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view class="mask" v-if="candanPop" @click="closeCanDan" @touchstart="closeCanDan"></view>
		<view class="phoneTab" :class="candanPop ? 'phoneTab-show' : 'phoneTab-hide'" v-if="!$isPC">
			<view @click="goPage('首页')">
				<view class='fs28' style='color:#ffffff'>首页</view>
				<view class='line1'></view>
			</view>
			<view @click="goPage('关于大赛')">
				<view class='fs28' style='color:#ffffff'>关于大赛</view>
				<view class='line1'></view>
			</view>
			<view @click="goPage('大赛动态')">
				<view class='fs28' style='color:#ffffff'>大赛动态</view>
				<view class='line1'></view>
			</view>
			<view @click="goPage('佳作展示')">
				<view class='fs28' style='color:#ffffff'>佳作展示</view>
				<view class='line1'></view>
			</view>
			<view>
				<view class='e2' @click.stop="toggleMobileCjcx">
					<view class='fs28' style='color:#ffffff'>成绩查询</view>
					<image class='wh28' :class="{rotate: isMobileCjcxOpen}"
						src='/static/local_assets/0d5044c717f6762977bfb232.png' />
				</view>
				<!--  改动在这里 -->
				<view class="mobile-cjcx-dropdown" :class="{show: isMobileCjcxOpen}">
					<view class="mobile-cjcx-item" v-for="(item, index) in pagesList" :key="index"
						:class="{active: item.id == cjcxId}" @click.stop="selectMobileCjcxType(item)">
						<view class='line1'></view>
						<view>{{item.name}}</view>
					</view>
				</view>
				<view class='line1'></view>
			</view>
			<view @click="goPage('个人中心')">
				<view class='fs28' style='color:#ffffff'>个人中心</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: "topBox",
		props: {
			pageName: '',
			cjcxId: {
				type: [Number, String],
				default: 1
			},
			cjcxName: {
				type: String,
				default: '成绩查询'
			},
			aboutPage: '',
			isShowAboutTab: {
				type: Boolean,
				default: true
			},
			myInfo: {
				type: Object,
				default: () => ({}),
			},
		},
		data() {
			return {
				candanPop: false,
				isCjcxDropdownOpen: false,
				isMobileCjcxOpen: false,
				pagesList: [{
					id: 1,
					name: '学生查询'
				}, {
					id: 2,
					name: '教师/单位证书'
				}],
				list: [{
					name: '首页',
					url: '/pages/index/index'
				}, {
					name: '关于大赛',
					url: '/pages/index/about'
				}, {
					name: '大赛动态',
					url: '/pages/index/dynamic'
				}, {
					name: '佳作展示',
					url: '/pages/index/appreciate'
				}, {
					name: '成绩查询',
					url: '/pages/index/grade'
				}, {
					name: '个人中心',
					url: '/pages/my/my'
				}],
				cjcx_id: '',
				cjcx_name: ''
			};
		},
		computed: {
			currentPickerIndex() {
				const index = this.pagesList.findIndex(item => item.id == this.cjcxId || item.name == this.cjcxName);
				return index >= 0 ? index : 0;
			}
		},
		watch: {
			pageName(newVal) {
				if (newVal !== '成绩查询') {
					this.isCjcxDropdownOpen = false;
					this.isMobileCjcxOpen = false;
				}
			}
		},
		mounted() {
			document.addEventListener('click', this.handleOutsideClick);
		},
		beforeDestroy() {
			document.removeEventListener('click', this.handleOutsideClick);
		},
		methods: {
			handleOutsideClick(e) {
				if (!e.target.closest('.cjcx-dropdown') && !e.target.closest('.mobile-cjcx-dropdown')) {
					this.isCjcxDropdownOpen = false;
					this.isMobileCjcxOpen = false;
				}
			},
			// 新增：鼠标移入显示
			handleCjcxMouseEnter() {
				if (this.$isPC) {
					this.isCjcxDropdownOpen = true;
				}
			},
			// 新增：鼠标移出隐藏
			handleCjcxMouseLeave() {
				if (this.$isPC) {
					this.isCjcxDropdownOpen = false;
				}
			},
			goGrzx() {
				uni.switchTab({
					url: '/pages/my/my'
				})
			},
			// 在 components/topBox.vue 的 methods 中

			// PC端下拉选择
			selectCjcxType(item) {
				// 1. 发射事件（如果当前就在 grade 页，用于实时更新视图）
				this.$emit('updateCjcxType', {
					id: item.id,
					name: item.name
				});

				this.isCjcxDropdownOpen = false;

				// 2. 【关键】先更新缓存，确保下次进入页面能读到最新的选择
				uni.setStorageSync('last_cjcx_type', {
					id: item.id,
					name: item.name
				});

				// 3. 执行不带参数的跳转
				uni.switchTab({
					url: '/pages/index/grade'
				});
			},

			// 移动端下拉选择
			selectMobileCjcxType(item) {
				// 1. 发射事件
				this.$emit('updateCjcxType', {
					id: item.id,
					name: item.name
				});

				this.isMobileCjcxOpen = false;
				this.candanPop = false;

				// 2. 【关键】先更新缓存
				uni.setStorageSync('last_cjcx_type', {
					id: item.id,
					name: item.name
				});

				// 3. 执行不带参数的跳转
				uni.switchTab({
					url: '/pages/index/grade'
				});
			},
			toggleCjcxDropdown() {
				// 仅在非PC端或需要强制切换时使用，PC端主要靠hover
				if (!this.$isPC) {
					this.isCjcxDropdownOpen = !this.isCjcxDropdownOpen;
				} else {
					// PC端点击也可以切换，作为hover的补充
					this.isCjcxDropdownOpen = !this.isCjcxDropdownOpen;
				}
			},
			toggleMobileCjcx() {
				this.isMobileCjcxOpen = !this.isMobileCjcxOpen;
			},
			goPage(name) {
				this.candanPop = false;
				this.isMobileCjcxOpen = false;
				if (this.pageName != name) {
					if (name == '首页') {
						uni.switchTab({
							url: '/pages/index/index'
						})
					}
					if (name == '关于大赛') {
						uni.switchTab({
							url: '/pages/index/about'
						})
					}
					if (name == '大赛动态') {
						uni.reLaunch({
							url: '/pages/index/dynamic'
						})
					}
					if (name == '佳作展示') {
						uni.reLaunch({
							url: '/pages/index/appreciate'
						})
					}
					if (name == '成绩查询') {
						uni.switchTab({
							url: '/pages/index/grade'
						})
					}
					if (name == '个人中心') {
						if (this.myInfo && this.myInfo.phone) {
							uni.switchTab({
								url: '/pages/my/my'
							})
						} else {
							uni.reLaunch({
								url: '/pages/login/login'
							})
						}
					}
				} else {
					if (this.pageName == '关于大赛') {
						this.$emit('toggleAboutTab');
					}
					if (name == '佳作展示') {
						uni.reLaunch({
							url: '/pages/index/appreciate'
						})
					}
				}
			},
			goTwoPage(pageName) {
				this.$emit('updateAboutPage', pageName);
			},
			gotoLogin(e) {
				uni.navigateTo({
					url: '/pages/login/login?is_school=' + e
				})
			},
			openCanDan() {
				this.candanPop = !this.candanPop;
				this.isMobileCjcxOpen = false;
			},
			closeCanDan() {
				this.candanPop = false;
				this.isMobileCjcxOpen = false;
			},
			// 假设父组件有这个方法，如果没有请确保父组件定义或移除调用
			maskString(str) {
				if (!str) return '';
				return str.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
			},
			reLaunch(url) {
				uni.reLaunch({
					url
				});
			}
		}
	}
</script>

<style lang="scss" scoped>
	/*  电脑端样式 */
	@media (min-width: 769px) {
		.kongggg {
			width: 5vw;
		}

		.topBox {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 6.25vw;
			background: #E62402;
			z-index: 700;

			.view_3l8i {
				width: 86.56vw;
				max-width: 4200rpx;
				padding: 0 2vw;
				box-sizing: border-box;
			}

			.logo {
				width: 24.13vw;
			}

			.view_bfa3 {
				position: relative;
				gap: 2.24vw;
				margin-right: 4.27vw;

				.cjcx-dropdown {
					position: relative;
					display: inline-block;
					cursor: pointer;

					.cjcx-trigger {
						display: flex;
						flex-direction: column;
						align-items: center;

						.dropdown-arrow {
							width: 0.8vw;
							height: 0.8vw;
							margin-top: 0.2vw;
							margin-left: 0.5vw;
							/* 确保间距 */
							transition: transform 0.3s ease;
							display: inline-block;
							/* 确保显示 */
						}

						.rotate {
							transform: rotate(180deg);
						}
					}

					.cjcx-dropdown-menu {
						position: absolute;
						top: 100%;
						left: -2.4vw;
						width: 10vw;
						background: #fff;
						border-radius: 8rpx;
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
						z-index: 800;
						padding: 0.5vw 0;

						/* 默认隐藏，通过 class 或 hover 显示 */
						visibility: hidden;
						opacity: 0;
						// transition: all 0.3s ease;
						transform: translateY(-10px);

						/* 当拥有 show 类或者父元素被 hover 时显示 */
						&.show,
						.cjcx-dropdown:hover & {
							visibility: visible;
							opacity: 1;
							transform: translateY(0);
						}

						.cjcx-dropdown-item {
							padding: 0.6vw 1vw;
							font-size: 0.94vw;
							white-space: nowrap;
							color: #333;
							cursor: pointer;
							text-align: center;
							transition: background-color 0.2s ease;

							&:hover {
								background-color: #f5f5f5;
							}

							&.active {
								color: #E62402;
								font-weight: bold;
							}
						}
					}
				}

				.text_true {
					cursor: pointer;
					font-weight: bold;
					font-size: 0.94vw;
					color: #FFFFFF;
					margin-top: 0.66vw;
					margin-bottom: 0.83vw;
				}

				.text_false {
					cursor: pointer;
					font-weight: 400;
					font-size: 0.94vw;
					color: #1F1111;
					margin-top: 0.66vw;
					margin-bottom: 0.83vw;
				}

				.line_true {
					cursor: pointer;
					width: 1.67vw;
					height: 0.1vw;
					background: #FFFFFF;
				}

				.line_false {
					cursor: pointer;
					width: 1.67vw;
					height: 0.1vw;
					background: none;
				}
			}

			/* 其他 PC 样式保持不变 */
			.bod_left {
				border-radius: 150rpx 0 0 150rpx;
				background: linear-gradient(270deg, #FF8800 0%, #FFB973 100%);
			}

			.bod_right {
				border-radius: 0 150rpx 150rpx 0;
				background: linear-gradient(270deg, #FF8989 0%, #FF3B3B 100%);
			}

			.tx-img {
				width: 3.13vw;
				height: 3.13vw;
				margin-right: 0.52vw;
				border-radius: 50%;
			}

			.text1 {
				font-weight: 500;
				font-size: 1vw;
				color: #ffffff;
			}

			.view_d4g5 {
				width: 5.36vw;
				height: 2vw;
				cursor: pointer;

				image {
					width: 1.04vw;
					height: 1.04vw;
					margin-right: 0.1vw;
				}

				text {
					font-size: 0.73vw;
					color: #fff;
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {

		/* 手机端导航动画 */
		.phoneTab {
			transition: all 0.3s ease-out;
			transform: translateY(-100%);
			opacity: 0;
			visibility: hidden;
		}

		.phoneTab-show {
			transform: translateY(0);
			opacity: 1;
			visibility: visible;
		}

		.phoneTab-hide {
			transform: translateY(-100%);
			opacity: 0;
			visibility: hidden;
		}


		.kongggg {
			width: 0vw;
		}

		.phoneTab {
			position: fixed;
			top: 126rpx;
			left: 0;
			width: 100%;
			background-color: rgba(0, 0, 0, 0.8);
			padding: 30rpx 30rpx 50rpx 30rpx;
			box-sizing: border-box;
			z-index: 700;

			.mobile-cjcx-dropdown {
				border-radius: 10rpx;
				margin-top: 10rpx;
				// padding: 20rpx 0;

				/* 动画核心 */
				max-height: 0;
				opacity: 0;
				overflow: hidden;
				transition: all 0.3s ease-out;

				&.show {
					max-height: 500rpx;
					opacity: 1;
				}

				.mobile-cjcx-item {
					padding: 0 0rpx 0 30rpx;
					font-size: 28rpx;
					color: #fff;
					cursor: pointer;
					text-align: left;

					&.active {
						color: #E62402;
						font-weight: bold;
					}
				}
			}

			.line1 {
				width: 100%;
				height: 0.5rpx;
				margin: 32rpx 0;
				background-color: #848484;
			}

			.rotate {
				transform: rotate(90deg);
			}
		}

		.topBox {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			background: #E62402;
			padding: 30rpx;
			box-sizing: border-box;
			z-index: 700;

			.view_3l8i {
				width: 100%;
			}

			.logo {
				width: 500rpx;
			}

			/* 移动端不需要复杂的 dropdown hover 样式，主要依赖点击 */
		}
	}

	.mask {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(0, 0, 0, 0.1);
		z-index: 699;
	}
</style>
