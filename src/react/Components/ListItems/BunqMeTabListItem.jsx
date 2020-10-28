import React from "react";
import { translate } from "react-i18next";
import withTheme from "@material-ui/core/styles/withTheme";
import withStyles from "@material-ui/core/styles/withStyles";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Divider from "@material-ui/core/Divider";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Icon from "@material-ui/core/Icon";

import ArrowDownwardIcon from "@material-ui/icons/KeyboardArrowDown";
import ArrowUpwardIcon from "@material-ui/icons/KeyboardArrowUp";
import CopyIcon from "@material-ui/icons/FileCopy";
import Share from "@material-ui/icons/Share";

import PaymentListItem from "./PaymentListItem";
import AccountQRFullscreen from "../QR/AccountQRFullscreen";
import TranslateButton from "../TranslationHelpers/Button";
import CopyToClipboardWrap from "../CopyToClipboardWrap";

import { humanReadableDate, formatMoney } from "../../Functions/Utils";

const styles = {
    actionListItem: {
        padding: 16,
        marginTop: 16,
        marginBottom: 8
    },
    smallAvatar: {
        width: 50,
        height: 50
    }
};

const classStyles = theme => ({
    badge: {
        top: -8,
        right: -8,
        border: `2px solid ${theme.palette.type === "light" ? theme.palette.grey[200] : theme.palette.grey[900]}`
    }
});

class BunqMeTabListItem extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            extraInfoOpen: false,
            paymentsOpen: false
        };
    }

    toggleExtraInfo = () => {
        this.setState({ extraInfoOpen: !this.state.extraInfoOpen });
    };

    togglePayments = () => {
        this.setState({ paymentsOpen: !this.state.paymentsOpen });
    };

    cancelTab = () => {
        const { bunqMeTab, user, accounts } = this.props;
        this.props.bunqMeTabPut(user.id, bunqMeTab.monetary_account_id, bunqMeTab.id);
    };

    render() {
        const { bunqMeTab, accounts, theme, t } = this.props;

        let iconColor = null;
        let canBeCanceled = false;
        switch (bunqMeTab.status) {
            case "CANCELLED":
                iconColor = theme.palette.bunqMeTabs.cancelled;
                break;
            case "EXPIRED":
                iconColor = theme.palette.bunqMeTabs.expired;
                break;
            case "WAITING_FOR_PAYMENT":
            default:
                canBeCanceled = true;
                iconColor = theme.palette.bunqMeTabs.awaiting_payment;
                break;
        }
        const shareUrl = bunqMeTab.bunqme_tab_share_url;
        const createdDate = humanReadableDate(bunqMeTab.created);
        const updatedDate = humanReadableDate(bunqMeTab.updated);
        const expiryDate = humanReadableDate(bunqMeTab.time_expiry);
        const bunqMeTabPayments = bunqMeTab.result_inquiries;
        const numberOfPayments = bunqMeTabPayments.length;

        // calculate how much was paid to this inquiry
        const totalPaidAmount = bunqMeTabPayments.reduce((accumulator, bunqMeTabInquiry) => {
            const payment = bunqMeTabInquiry.payment.Payment;
            const paidAmount = parseFloat(payment.amount.value);
            return accumulator + paidAmount;
        }, 0);

        // format the amounts
        // fill with empty values first
        let formattedInquiredAmount = formatMoney(0.00);
        let formattedTotalPaid = formatMoney(0.00);
        let merchantList = [];

        // only fill real values if tab isn't canceled, will crash otherwise
        if (bunqMeTab.status !== 'CANCELLED' && bunqMeTab.bunqme_tab_entry !== null) {
            formattedInquiredAmount = formatMoney(bunqMeTab.bunqme_tab_entry.amount_inquired.value);
            formattedTotalPaid = formatMoney(totalPaidAmount);
            merchantList = bunqMeTab.bunqme_tab_entry.merchant_available
                .filter(merchant => merchant.available)
                .map(merchant => merchant.merchant_type)
                .join(", ");
        }

        const avatarStandalone = (
            <Avatar style={styles.smallAvatar}>
                <Share color="inherit" style={{ color: iconColor }} />
            </Avatar>
        );

        const itemAvatar =
            bunqMeTabPayments.length <= 0 ? (
                avatarStandalone
            ) : (
                <Badge
                    badgeContent={bunqMeTabPayments.length}
                    color="primary"
                    classes={{ badge: this.props.classes.badge }}
                >
                    {avatarStandalone}
                </Badge>
            );

        const primaryText =
            bunqMeTab.bunqme_tab_entry !== null
                ? bunqMeTab.bunqme_tab_entry.description
                : t("Cancelled payment request")

        const secondaryText =
            bunqMeTabPayments.length > 0
                ? `${t("Received")}: ${formattedTotalPaid}`
                : `${t("Requested amount")}: ${formattedInquiredAmount}`;

        return [
            <ListItem button onClick={this.toggleExtraInfo}>
                {itemAvatar}
                <ListItemText primary={primaryText} secondary={secondaryText} />
                <ListItemSecondaryAction style={{ marginTop: -16 }}>
                    <AccountQRFullscreen mode="HIDDEN" text={shareUrl} />
                    <CopyToClipboardWrap text={shareUrl} onCopy={this.props.copiedValue("the bunq tab url")}>
                        <IconButton aria-label="Copy the share url">
                            <CopyIcon />
                        </IconButton>
                    </CopyToClipboardWrap>
                </ListItemSecondaryAction>
            </ListItem>,
            <Collapse in={this.state.extraInfoOpen} unmountOnExit>
                <ListItem dense>
                    <ListItemText primary={t("Created")} secondary={createdDate} />
                </ListItem>

                {updatedDate !== createdDate ? (
                    <ListItem dense>
                        <ListItemText primary={t("Updated")} secondary={updatedDate} />
                    </ListItem>
                ) : null}

                <ListItem dense>
                    <ListItemText primary={t("Expires")} secondary={expiryDate} />
                </ListItem>

                <ListItem dense>
                    <ListItemText primary={t("Available merchants")} secondary={merchantList} />
                </ListItem>

                <ListItem button dense onClick={this.togglePayments}>
                    <ListItemText primary={t("Number of payments")} secondary={"" + numberOfPayments} />
                    <ListItemSecondaryAction>
                        <Icon color="action">
                            {this.state.paymentsOpen ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                        </Icon>
                    </ListItemSecondaryAction>
                </ListItem>

                <Collapse in={this.state.paymentsOpen} unmountOnExit>
                    {bunqMeTabPayments.map(bunqMeTabPayment => {
                        return (
                            <PaymentListItem
                                accounts={accounts}
                                payment={bunqMeTabPayment.payment.Payment}
                                BunqJSClient={this.props.BunqJSClient}
                            />
                        );
                    })}
                </Collapse>

                {canBeCanceled ? (
                    <ListItem style={styles.actionListItem}>
                        <ListItemSecondaryAction>
                            <TranslateButton
                                variant="contained"
                                disabled={this.props.bunqMeTabLoading || this.props.bunqMeTabsLoading}
                                color="secondary"
                                onClick={this.cancelTab}
                            >
                                Cancel request
                            </TranslateButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ) : null}
            </Collapse>,
            <Divider style={{ marginBottom: this.state.paymentsOpen ? 12 : 0 }} />
        ];
    }
}

BunqMeTabListItem.defaultProps = {
    minimalDisplay: false
};

export default withTheme()(translate("translations")(withStyles(classStyles)(BunqMeTabListItem)));
