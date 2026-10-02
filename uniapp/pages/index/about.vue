<template>
	<view>
		<topBox pageName="关于大赛" :aboutPage="aboutPage" :isShowAboutTab='isShowAboutTab'
			@updateAboutPage="handleAboutPageChange" @toggleAboutTab="isShowAboutTab = !isShowAboutTab"
			:myInfo='myInfo'></topBox>
		<view class='pageBox zzz3'>
			<view class='app_imgBox zzz3'>
				<view class='title'>关于大赛</view>
			</view>
			<view class='tabBox e2'>
				<view class='zzz3' @click="goAbout_Page(item)" v-for="(item, index) in list" :key="index">
					<view :class="aboutPage==item?'text_true':'text_false'">{{item}}</view>
					<view :class="aboutPage==item?'line_true':'line_false'"></view>
				</view>
			</view>
			<view class='tabLine'></view>

			<!-- 大赛介绍 -->
			<view class='bjBox zzz3' v-if="aboutPage=='大赛介绍'">
				<view :class="$isPC?'bjWidth e22':'bjWidth'">
					<view class='text1'>
						{{configData.dasaijieshao}}
					</view>
					<image class='img1' :src="configData.shouyeimage" :mode="$isPC?'widthFix':'widthFix'"
						style="object-fit: cover" />
				</view>
			</view>

			<!-- 大赛章程 -->
			<view class='bjBox zzz3' v-if="aboutPage=='大赛章程'">
				<view class='bjWidth text2 rich-text-content' v-html="configData.dasaizhangcheng"></view>
			</view>

			<view class='bjBox zzz3' v-if="aboutPage=='赛项设置'">
				<setBox :myInfo='myInfo'></setBox>
			</view>

			<view class='bjBox zzz3' v-if="aboutPage=='学术评审'">
				<view class='bjWidth2 e2 e3'>
					<view class='peopleBox zzz3' v-for="(item, index) in displayXsList" :key="index"
						:class="{ 'placeholder': !item.title }"
						@click="navigateTo('/pages/index/renDetails?id='+item.id)">
						<image class='avaImg' :src='item.image' mode="aspectFit" style="" />
						<view class='textBox zzz3'>
							<view class='name-line zzz3'>
								<view class='name'>{{item.title}}</view>
								<view class='line'></view>
							</view>
							<view class='title1-title2'>
								<!-- <view class='title2 textsl4'>{{extractChinese(item.content)}}</view> -->
								<view class='title2 textsl4'>{{item.description}}</view>
								<view class='viewDetail'>查看详情</view>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view class='bjBox zzz3' v-if="aboutPage=='联系我们'">
				<view class='bjWidth tuwen' :class="$isPC?'e22':''">
					<view class='leftText'>
						<view class='e11'>
							<view class='text3 e2'>
								<view>联</view>
								<view>系</view>
								<view>人</view>
							</view>
							<view class="maohao">：</view>
							<view class='text4'>{{configData.shouhoufuwu}}</view>
						</view>
						<view class='e11'>
							<view class='text3 e2'>
								<view>联</view>
								<view>系</view>
								<view>电</view>
								<view>话</view>
							</view>
							<view class="maohao">：</view>
							<view class='text4'>{{configData.shouji}}</view>
						</view>
						<view class='e11'>
							<view class='text3 e2'>
								<view>电</view>
								<view>子</view>
								<view>邮</view>
								<view>箱</view>
							</view>
							<view class="maohao">：</view>
							<view class='text4'>{{configData.youxiang}}</view>
						</view>
						<view class='e11'>
							<view class='text3 e2'>
								<view>微</view>
								<view>信</view>
								<view>公</view>
								<view>众</view>
								<view>号</view>
							</view>
							<view class="maohao">：</view>
							<view class='text4'>{{configData.weixin}}</view>
						</view>
						<view class='e11'>
							<view class='text3 e2'>
								<view>联</view>
								<view>系</view>
								<view>地</view>
								<view>址</view>
							</view>
							<view class="maohao">：</view>
							<view class='text4'>{{configData.dizhi}}</view>
						</view>
					</view>
					<view class='rightTextImg zzz3'>
						<image class="pointer" :src="configData.gongzhonghao[0]" mode="aspectFill"
							style="object-fit: cover" @click="lookImg(configData.gongzhonghao[0])" />
						<text>大赛公众号</text>
					</view>
				</view>
			</view>
		</view>
		<bottomBox pageName='关于大赛' :configData="configData"></bottomBox>
	</view>
</template>
<script>
	import topBox from '@/components/topBox.vue';
	import bottomBox from '@/components/bottomBox.vue';
	import setBox from '@/components/setBox.vue';
	export default {
		components: {
			topBox,
			bottomBox,
			setBox
		},
		data() {
			return {
				isShowAboutTab: true,
				aboutPage: '大赛介绍',
				list: [],
				xslist: [],
				myInfo: {},
				isLogin: true,

				page: 1,
				limit: 9,
				loading: false,
				noMore: false,

				configData: {}
			}
		},
		onLoad() {
			this.GET({
				name: '学术评审开关',
				url: '/api/product/Pingshenflag',
				data: {}
			}).then((res) => {
				if (res.data.data.flag == 1) {
					this.list = ['大赛介绍', '大赛章程', '赛项设置', '学术评审', '联系我们']
				} else {
					this.list = ['大赛介绍', '大赛章程', '赛项设置', '联系我们']
				}
			});
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
			this.get_index()

			this.GET({
				name: '获取网站配置',
				url: '/api/product/getconfig',
				data: {}
			}).then((res) => {
				this.configData = res.data.data
			});
		},

		onReachBottom() {
			if (this.aboutPage === '学术评审') {
				this.loadMore()
			}
		},

		computed: {
			displayXsList() {
				let list = [...this.xslist];
				const len = list.length;
				if (len > 0 && len % 3 === 2) {
					list.push({});
				}
				return list;
			}
		},
		methods: {
			get_index() {
				if (this.loading || this.noMore) return;
				this.loading = true;

				this.GET({
					name: '学术评审',
					url: '/api/product/index',
					data: {
						category: 1,
						page: this.page,
						limit: this.limit
					}
				}).then((res) => {
					this.loading = false;
					const data = res.data.data.data || [];

					if (data.length < this.limit) {
						this.noMore = true;
					}

					if (this.page === 1) {
						this.xslist = data;
					} else {
						this.xslist = [...this.xslist, ...data];
					}
				}).catch(() => {
					this.loading = false;
				});
			},

			loadMore() {
				if (this.noMore || this.loading) return;
				this.page++;
				this.get_index();
			},

			handleAboutPageChange(pageName) {
				this.aboutPage = pageName
			},

			goAbout_Page(item) {
				this.isShowAboutTab = false
				this.aboutPage = item

				if (item === '学术评审') {
					this.page = 1;
					this.noMore = false;
					this.xslist = [];
					this.get_index();
				}
			},

			extractChinese(html) {
				if (!html) return '';
				let text = html.replace(/<[^>]+>/g, '');
				text = text
					.replace(/&ldquo;/g, '“')
					.replace(/&rdquo;/g, '”')
					.replace(/&mdash;/g, '—')
					.replace(/\r|\n|\t/g, '');

				const chineseReg = /[\u4e00-\u9fa5，。！？；：“”‘’（）【】、——]/g;
				const match = text.match(chineseReg);
				return match ? match.join('') : '';
			}
		}
	}
</script>
<style lang="scss" scoped>
	/*  电脑端样式 */
	@media (min-width: 769px) {
		.pageBox {
			width: 100vw;

			.tabBox {
				width: 62.5vw;
				max-width: 3400rpx;

				.text_true {
					cursor: pointer;
					font-weight: bold;
					font-size: 0.94vw;
					color: #E62402;
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
					background: #E62402;
				}

				.line_false {
					cursor: pointer;
					width: 1.67vw;
					height: 0.1vw;
					background: none;
				}
			}

			.tabLine {
				width: 100vw;
				height: 1rpx;
				background: #E62402;
				margin-bottom: 3.49vw;
			}

			.bjBox {
				width: 100vw;
				background-image: url('/static/local_assets/2c2f2b5f1ca91e6bba21390d.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;

				.bjWidth {
					width: 62.5vw;
					max-width: 3400rpx;
					margin-bottom: 3vw;
				}

				.bjWidth2 {
					width: 55.2vw;
					max-width: 2900rpx;
					margin-bottom: 3vw;
				}

				.tuwen {
					margin-bottom: 9vw;
				}

				.peopleBox {
					width: 15.63vw;
					cursor: pointer;
				}

				.avaImg {
					width: 6vw;
					height: 8vw;
					background: #D9D9D9;
					border-radius: 50%;
					border: 8rpx solid #FFFFFF;
					box-sizing: border-box;
					z-index: 100;
					box-shadow: none;
					transition: box-shadow 0.25s ease;
				}

				.textBox {
					position: relative;
					width: 100%;
					height: 19.84vw;
					border-radius: 104rpx;
					box-shadow: none;
					margin-top: -3.645vw;
					margin-bottom: 2.8vw;
					background-color: #FFFFFF;
					transition: box-shadow 0.25s ease;
					border: 5rpx solid #EEEEEE;

					.name-line {
						position: absolute;
						top: 3.84vw;
						width: 100%;

						.name {
							text-align: center;
							font-size: 1.04vw;
							color: #000000;
						}

						.line {
							width: 1.56vw;
							height: 6rpx;
							background: #E62402;
							margin: 0.3vw 0 0 0;
						}
					}

					.title1-title2 {
						position: absolute;
						top: 6.84vw;
						width: 13.70vw;
						height: 10.26vw;
						/* 6行高度: 0.95vw * 1.8 * 6 */

						.title1 {
							font-size: 0.68vw;
							color: #666666;
							margin-bottom: 0.4vw;
						}

						/* 统一学术评审字号行高 */
						.title2 {
							width: 13.70vw;
							font-size: 1.04vw;
							color: #999999;
							line-height: 1.8;
							text-align: justify;
							text-align-last: left;
							height: 7.49vw;
							/* 4行高度: 1.04vw * 1.8 * 4 */
							overflow: hidden;
						}

						.viewDetail {
							font-size: 0.8vw;
							color: #E62402;
							text-align: center;
							cursor: pointer;
							padding: 0.3vw 0;
							position: absolute;
							bottom: 0;
							left: 0;
							width: 100%;
						}
					}
				}

				.peopleBox:hover .avaImg,
				.peopleBox:hover .textBox {
					box-shadow: 0px 0 52rpx 0px rgba(0, 0, 0, 0.25);
				}

				.leftText {
					width: 50vw;
					margin-left: 3.75vw;
					gap: 1.5vw;
					display: flex;
					flex-direction: column;

					.text3 {
						width: 8vw;
						font-size: 1.04vw;
						color: #E62402;
					}

					.text4 {
						font-size: 1.04vw;
						color: #1F1F1F;
					}

					.maohao {
						font-size: 1.04vw;
						color: #E62402;
					}
				}

				.rightTextImg {
					margin-right: 1.88vw;

					image {
						width: 14.06vw;
						height: 14.06vw;
						background: #D9D9D9;
						margin-bottom: 1.82vw;
					}

					text {
						font-weight: 500;
						font-size: 1.25vw;
						color: #1F1F1F;
					}
				}

				.setImg {
					width: 27.66vw;
					height: 13.96vw;
				}

				.set1 {
					margin-left: 1.46vw;
				}

				.set2 {
					margin-right: 1.46vw;
				}

				/* 统一大赛介绍 */
				.text1 {
					width: 28.18vw;
					font-size: 1.04vw;
					color: #1F1F1F;
					text-align: justify;
					text-align-last: left;
					letter-spacing: 0;
					line-height: 1.8;
					margin-bottom: 1vw;
					text-indent: 2em;
				}

				/* 统一大赛章程 */
				.text2,
				.rich-text-content {
					font-weight: 500;
					font-size: 1.04vw;
					color: #1F1F1F;
					line-height: 1.8;
					// text-align: justify;
					// text-align-last: left;
					// white-space: pre-wrap;
					// word-wrap: break-word;
					// text-indent: 2em;
					font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;

					::v-deep p {
						margin-bottom: 1em;
						line-height: 1.8;
						text-indent: 2em;
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;
					}

					::v-deep div {
						margin-bottom: 0.5em;
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;
					}

					::v-deep img {
						max-width: 100%;
						height: auto;
					}

					::v-deep * {
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;
					}
				}

				.img1 {
					width: 30vw;
					height: 30vw;
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.pageBox {
			width: 100vw;

			.tabBox {
				width: 700rpx;

				.text_true {
					cursor: pointer;
					font-weight: bold;
					font-size: 28rpx;
					color: #E62402;
					margin-top: 20rpx;
					margin-bottom: 10rpx;
				}

				.text_false {
					cursor: pointer;
					font-weight: 400;
					font-size: 28rpx;
					color: #1F1111;
					margin-top: 20rpx;
					margin-bottom: 10rpx;
				}

				.line_true {
					cursor: pointer;
					width: 50rpx;
					height: 4rpx;
					background: #E62402;
				}

				.line_false {
					cursor: pointer;
					width: 50rpx;
					height: 4rpx;
					background: none;
				}
			}

			.tabLine {
				width: 100vw;
				height: 1rpx;
				background: #E62402;
				margin-bottom: 20rpx;
			}

			.bjBox {
				width: 100vw;
				background-image: url('/static/local_assets/2c2f2b5f1ca91e6bba21390d.png');
				background-position: center center;
				background-repeat: no-repeat;
				background-size: cover;

				.bjWidth {
					width: 700rpx;
					margin-bottom: 70rpx;
				}

				.bjWidth2 {
					width: 700rpx;
					margin-bottom: 70rpx;
				}

				.tuwen {
					margin-bottom: 9vw;
				}

				.peopleBox {
					width: 336rpx;
					cursor: pointer;
				}

				.avaImg {
					width: 110rpx;
					height: 140rpx;
					background: #D9D9D9;
					border-radius: 50%;
					border: 8rpx solid #FFFFFF;
					box-sizing: border-box;
					z-index: 100;
					box-shadow: none;
					transition: box-shadow 0.25s ease;
					margin-bottom: 20rpx;
				}

				.textBox {
					position: relative;
					width: 100%;
					height: 470rpx;
					border-radius: 14rpx;
					box-shadow: none;
					margin-top: -60rpx;
					margin-bottom: 40rpx;
					background-color: #FFFFFF;
					transition: box-shadow 0.25s ease;
					border: 2rpx solid #EEEEEE;

					.name-line {
						position: absolute;
						top: 50rpx;
						width: 100%;

						.name {
							text-align: center;
							font-size: 32rpx;
							color: #000000;
						}

						.line {
							width: 20rpx;
							height: 6rpx;
							background: #E62402;
							margin: 4rpx 0 0 0;
						}
					}

					.title1-title2 {
						position: absolute;
						top: 120rpx;
						width: 90%;
						height: 280.8rpx;
						/* 6行高度: 26rpx * 1.8 * 6 */

						.title1 {
							font-size: 28rpx;
							color: #666666;
							margin-bottom: 20rpx;
						}

						/* 统一学术评审 */
						.title2 {
							width: 100%;
							font-size: 28rpx;
							color: #999999;
							line-height: 1.8;
							text-align: justify;
							text-align-last: left;
							height: 201.6rpx;
							/* 4行高度: 28rpx * 1.8 * 4 */
							overflow: hidden;
						}

						.viewDetail {
							font-size: 24rpx;
							color: #E62402;
							text-align: center;
							cursor: pointer;
							padding: 10rpx 0;
							position: absolute;
							bottom: 0;
							left: 0;
							width: 100%;
						}
					}
				}

				.leftText {
					width: 100%;
					margin-left: 10rpx;
					gap: 16rpx;
					display: flex;
					flex-direction: column;

					.text3 {
						width: 200rpx;
						font-size: 28rpx;
						color: #E62402;
					}

					.text4 {
						width: 400rpx;
						font-size: 28rpx;
						color: #1F1F1F;
					}

					.maohao {
						font-size: 28rpx;
						color: #E62402;
					}
				}

				.rightTextImg {
					margin-top: 70rpx;

					image {
						width: 200rpx;
						height: 200rpx;
						background: #D9D9D9;
						margin-bottom: 20rpx;
					}

					text {
						font-weight: 500;
						font-size: 32rpx;
						color: #1F1F1F;
					}
				}

				.setImg {
					width: 100%;
				}

				/* 统一大赛介绍 */
				.text1 {
					width: 100%;
					font-weight: 500;
					font-size: 28rpx;
					color: #1F1F1F;
					text-align: justify;
					text-align-last: left;
					letter-spacing: 0;
					line-height: 1.8;
					margin-bottom: 20rpx;
					text-indent: 2em;
				}

				/* 统一大赛章程 */
				.text2,
				.rich-text-content {
					font-weight: 500;
					font-size: 28rpx;
					color: #1F1F1F;
					line-height: 1.8;
					// text-align: justify;
					// text-align-last: left;
					// white-space: pre-wrap;
					// word-wrap: break-word;
					text-indent: 2em;
					font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;

					::v-deep p {
						margin-bottom: 20rpx;
						line-height: 1.8;
						text-indent: 2em;
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;
					}

					::v-deep div {
						margin-bottom: 10rpx;
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;
					}

					::v-deep img {
						max-width: 100%;
						height: auto;
					}

					::v-deep * {
						font-family: 'Noto Sans SC', 'Source Han Sans SC', '思源黑体', 'Microsoft YaHei', 'PingFang SC', sans-serif !important;
					}
				}

				.img1 {
					width: 100%;
				}
			}
		}
	}

	.placeholder {
		visibility: hidden;
	}

	.rich-text-content {
		white-space: pre-wrap;
		line-height: 1.8;
	}

	.rich-text-content ::v-deep p {
		text-indent: 2em;
		margin-bottom: 1em;
	}
</style>