<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/*每个页面公共css */
	@import "@/common.scss";

	view {
		user-select: text;
		/* 标准属性 */
		-webkit-user-select: text;
		/* Webkit 内核 (Chrome, Safari, 小程序) */
		-moz-user-select: text;
		/* Firefox */
		-ms-user-select: text;
		/* IE/Edge */
	}

	text {
		user-select: text;
		/* 标准属性 */
		-webkit-user-select: text;
		/* Webkit 内核 (Chrome, Safari, 小程序) */
		-moz-user-select: text;
		/* Firefox */
		-ms-user-select: text;
		/* IE/Edge */
	}


	/*  电脑端样式 */
	@media (min-width: 769px) {
		.app_imgBox {
			position: relative;
			width: 100vw;
			height: 20.83vw;
			background-image: url('/static/local_assets/4efe0a15749fee16685386c8.png');
			background-position: center center;
			background-repeat: no-repeat;
			background-size: cover;

			.title {
				position: absolute;
				bottom: 6vw;
				width: 100%;
				font-weight: bold;
				font-size: 3.13vw;
				color: #FFFFFF;
				text-align: center;
			}
		}

		.app_scrollView {
			width: 100%;
			white-space: nowrap;
			box-sizing: border-box;
			margin: 4.43vw 0;

			.numE1 {
				gap: 1vw;

				.true {
					cursor: pointer;
					width: 2vw;
					height: 2vw;
					background: #E62402;
					border-radius: 10rpx;
					font-size: 1vw;
					color: #FFFFFF;
					text-align: center;
					line-height: 2vw;
					flex-shrink: 0;
				}

				.false {
					cursor: pointer;
					width: 2vw;
					height: 2vw;
					background: #f5f5f5;
					border-radius: 10rpx;
					font-size: 1vw;
					color: #1F1F1F;
					text-align: center;
					line-height: 2vw;
					flex-shrink: 0;
				}

				.false2 {
					cursor: pointer;
					width: 2vw;
					height: 2vw;
					background: #ffffff;
					border-radius: 10rpx;
					font-size: 1vw;
					color: #1F1F1F;
					text-align: center;
					line-height: 2vw;
					flex-shrink: 0;
				}
			}
		}
	}

	/*  手机端样式 */
	@media (max-width: 768px) {
		.app_imgBox {
			position: relative;
			width: 100vw;
			height: 400rpx;
			background-image: url('/static/local_assets/4efe0a15749fee16685386c8.png');
			background-position: center center;
			background-repeat: no-repeat;
			background-size: cover;

			.title {
				position: absolute;
				bottom: 120rpx;
				width: 100%;
				font-weight: bold;
				font-size: 46rpx;
				color: #FFFFFF;
				text-align: center;
			}
		}

		.app_scrollView {
			width: 100%;
			white-space: nowrap;
			box-sizing: border-box;
			margin: 40rpx 0;

			.numE1 {
				gap: 20rpx;

				.true {
					cursor: pointer;
					width: 50rpx;
					height: 50rpx;
					background: #E62402;
					border-radius: 4rpx;
					font-size: 32rpx;
					color: #FFFFFF;
					text-align: center;
					line-height: 50rpx;
					flex-shrink: 0;
				}

				.false {
					cursor: pointer;
					width: 50rpx;
					height: 50rpx;
					background: #f5f5f5;
					border-radius: 4rpx;
					font-size: 32rpx;
					color: #1F1F1F;
					text-align: center;
					line-height: 50rpx;
					flex-shrink: 0;
				}

				.false2 {
					cursor: pointer;
					width: 50rpx;
					height: 50rpx;
					background: #ffffff;
					border-radius: 10rpx;
					font-size: 32rpx;
					color: #1F1F1F;
					text-align: center;
					line-height: 50rpx;
					flex-shrink: 0;
				}
			}
		}
	}
</style>