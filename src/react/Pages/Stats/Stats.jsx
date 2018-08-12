import React from "react";
import { withTheme } from "@material-ui/core/styles";
import { translate } from "react-i18next";
import { connect } from "react-redux";
import Helmet from "react-helmet";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Switch from "@material-ui/core/Switch";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";

import AccountList from "../../Components/AccountList/AccountList";
import LoadOlderButton from "../../Components/LoadOlderButton";
import ClearBtn from "../../Components/FilterComponents/ClearFilter";
import FilterDrawer from "../../Components/FilterComponents/FilterDrawer";

import EventCountPieChart from "./Chart/EventCountPieChart";
import EventSplitCountPieChart from "./Chart/EventSplitCountPieChart";

import CategoryCountPieChart from "./Chart/CategoryCountPieChart";
import CategoryCountHistoryChart from "./Chart/CategoryCountHistoryChart";

import CategoryTransactionHistoryChart from "./Chart/CategoryTransactionHistoryChart";

import EventTypeTransactionHistoryChart from "./Chart/EventTypeTransactionHistoryChart";
import EventTypeSplitTransactionHistoryChart from "./Chart/EventTypeSplitTransactionHistoryChart";
import EventTypeHistoryChart from "./Chart/EventTypeHistoryChart";
import EventTypeSplitHistoryChart from "./Chart/EventTypeSplitHistoryChart";

const StatsWorker = require("../../WebWorkers/stats.worker.js");

const ChartTitle = ({ children, ...rest }) => {
    return (
        <Typography
            variant="title"
            style={{ textAlign: "center", padding: 8 }}
            {...rest}
        >
            {children}
        </Typography>
    );
};

class Stats extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            timescale: "daily",
            parsedData: false,

            // card payments split or combined under mastercardaction
            splitCardTypes: true,

            // transaction amount vs event count
            displayTransactionAmount: true,

            // total, sent or received amount setting
            categoryTransactionType: "total"
        };
        this.worker = new StatsWorker();
        this.worker.onmessage = this.handleWorkerEvent;
    }

    componentWillUnmount() {
        this.worker.terminate();
    }

    getSnapshotBeforeUpdate(nextProps, nextState) {
        let triggerWorker = false;
        const { timescale } = this.state;
        const { generalFilterDate } = this.props;

        // check if timescale changed
        if (timescale !== nextState.timescale) triggerWorker = true;

        // check if filter changed
        if (generalFilterDate !== nextProps.generalFilterDate)
            triggerWorker = true;

        const isCurrentlyLoading =
            this.props.bunqMeTabsLoading ||
            this.props.paymentsLoading ||
            this.props.requestResponsesLoading ||
            this.props.requestInquiriesLoading ||
            this.props.masterCardActionsLoading;
        const willBeLoading =
            nextProps.bunqMeTabsLoading ||
            nextProps.paymentsLoading ||
            nextProps.requestResponsesLoading ||
            nextProps.requestInquiriesLoading ||
            nextProps.masterCardActionsLoading;

        if (isCurrentlyLoading === true && willBeLoading === false) {
            // items are no longer loading so we can update trhe worker here
            triggerWorker = true;
        }

        if (triggerWorker) {
            // trigger an update with the next changed props
            this.triggerWorker(nextProps, nextState);
        }
        return null
    }
    componentDidUpdate() {}

    shouldComponentUpdate(nextProps) {
        const nextPropsLoading =
            nextProps.bunqMeTabsLoading ||
            nextProps.paymentsLoading ||
            nextProps.requestResponsesLoading ||
            nextProps.requestInquiriesLoading ||
            nextProps.masterCardActionsLoading;

        if (nextPropsLoading) {
            return false;
        }
        return true;
    }

    componentDidMount() {
        this.triggerWorker();
    }

    handleChange = (event, value) => {
        this.setState({ timescale: value });
    };

    triggerWorker = (props = this.props, state = this.state) => {
        this.worker.postMessage({
            // all endpoints
            payments: props.payments.map(item => item.toJSON()),
            masterCardActions: props.masterCardActions.map(item =>
                item.toJSON()
            ),
            requestInquiries: props.requestInquiries.map(item => item.toJSON()),
            requestResponses: props.requestResponses.map(item => item.toJSON()),
            bunqMeTabs: props.bunqMeTabs,

            // the accounts and selectedAccount so a balance can be calculated
            accounts: props.accounts.map(account => account.toJSON()),
            selectedAccount: props.selectedAccount,

            // different filter objects used in filtering the endpoints
            paymentFilterSettings: {
                paymentVisibility: props.paymentVisibility,
                paymentType: props.paymentType,
                dateFromFilter: props.dateFromFilter,
                dateToFilter: props.dateToFilter,
                selectedAccountIds: this.props.selectedAccountIds,
                toggleAccountIds: this.props.toggleAccountIds
            },
            bunqMeTabFilterSettings: {
                bunqMeTabVisibility: props.bunqMeTabVisibility,
                bunqMeTabType: props.bunqMeTabType,
                dateFromFilter: props.dateFromFilter,
                dateToFilter: props.dateToFilter,
                selectedAccountIds: this.props.selectedAccountIds,
                toggleAccountIds: this.props.toggleAccountIds
            },
            requestFilterSettings: {
                requestVisibility: props.requestVisibility,
                requestType: props.requestType,
                dateFromFilter: props.dateFromFilter,
                dateToFilter: props.dateToFilter,
                selectedAccountIds: this.props.selectedAccountIds,
                toggleAccountIds: this.props.toggleAccountIds
            },

            // category data
            categories: props.categories,
            categoryConnections: props.categoryConnections,

            // date range filters and timescale setting
            timeTo: props.dateToFilter,
            timeFrom: props.dateFromFilter,
            timescale: state.timescale
        });
    };

    handleWorkerEvent = event => {
        this.setState({ parsedData: event.data });
    };

    render() {
        const { t, theme } = this.props;

        const data =
            this.state.parsedData !== false
                ? this.state.parsedData
                : {
                      labels: [],
                      balanceHistoryData: [],
                      categoryCountHistory: {},
                      categoryTransactionHistory: {},
                      eventCountHistory: [],

                      // event count
                      requestInquiryHistory: [],
                      requestResponseHistory: [],
                      bunqMeTabHistory: [],
                      paymentHistory: [],
                      masterCardActionHistory: [],
                      maestroPaymentCountHistory: [],
                      tapAndPayPaymentCountHistory: [],
                      applePayPaymentCountHistory: [],
                      masterCardPaymentCountHistory: [],

                      // event transaction amount
                      paymentTransactionHistory: [],
                      requestInquiryTransactionHistory: [],
                      requestResponseTransactionHistory: [],
                      bunqMeTabTransactionHistory: [],
                      masterCardActionTransactionHistory: [],
                      masterCardPaymentTransactionHistory: [],
                      tapAndPayPaymentTransactionHistory: [],
                      maestroPaymentTransactionHistory: [],
                      applePayPaymentTransactionHistory: []
                  };

        const eventCountStats = (
            <Grid item xs={12}>
                <Grid container spacing={16}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Paper>
                            <List dense component="nav">
                                <ListItem>
                                    <ListItemText
                                        primary={t("Payments")}
                                        secondary={this.props.payments.length}
                                    />
                                </ListItem>
                                {this.state.splitCardTypes ? (
                                    <React.Fragment>
                                        <ListItem>
                                            <ListItemText
                                                primary={t(
                                                    "MasterCard payments"
                                                )}
                                                secondary={data.masterCardPaymentCountHistory.reduce(
                                                    (a, b) => a + b,
                                                    0
                                                )}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText
                                                primary={t("Maestro payments")}
                                                secondary={data.maestroPaymentCountHistory.reduce(
                                                    (a, b) => a + b,
                                                    0
                                                )}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText
                                                primary={t(
                                                    "Tap & Pay payments"
                                                )}
                                                secondary={data.tapAndPayPaymentCountHistory.reduce(
                                                    (a, b) => a + b,
                                                    0
                                                )}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText
                                                primary={t(
                                                    "Apple Pay payments"
                                                )}
                                                secondary={data.applePayPaymentCountHistory.reduce(
                                                    (a, b) => a + b,
                                                    0
                                                )}
                                            />
                                        </ListItem>
                                    </React.Fragment>
                                ) : (
                                    <ListItem>
                                        <ListItemText
                                            primary={t("Card payments")}
                                            secondary={
                                                this.props.masterCardActions
                                                    .length
                                            }
                                        />
                                    </ListItem>
                                )}
                                <ListItem>
                                    <ListItemText
                                        primary={t("Requests sent")}
                                        secondary={
                                            this.props.requestInquiries.length
                                        }
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary={t("Requests received")}
                                        secondary={
                                            this.props.requestResponses.length
                                        }
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemText
                                        primary={t("bunqme Requests")}
                                        secondary={this.props.bunqMeTabs.length}
                                    />
                                </ListItem>
                            </List>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Paper
                            style={{
                                padding: 12
                            }}
                        >
                            <ChartTitle>Event count</ChartTitle>

                            {this.state.splitCardTypes ? (
                                <EventSplitCountPieChart
                                    height={500}
                                    theme={theme}
                                    payments={this.props.payments}
                                    requestInquiryHistory={
                                        data.requestInquiryHistory
                                    }
                                    requestResponseHistory={
                                        data.requestResponseHistory
                                    }
                                    bunqMeTabHistory={data.bunqMeTabHistory}
                                    paymentHistory={data.paymentHistory}
                                    masterCardPaymentCountHistory={
                                        data.masterCardPaymentCountHistory
                                    }
                                    maestroPaymentCountHistory={
                                        data.maestroPaymentCountHistory
                                    }
                                    tapAndPayPaymentCountHistory={
                                        data.tapAndPayPaymentCountHistory
                                    }
                                    applePayPaymentCountHistory={
                                        data.applePayPaymentCountHistory
                                    }
                                />
                            ) : (
                                <EventCountPieChart
                                    height={500}
                                    theme={theme}
                                    payments={this.props.payments}
                                    masterCardActions={
                                        this.props.masterCardActions
                                    }
                                    requestInquiries={
                                        this.props.requestInquiries
                                    }
                                    requestResponses={
                                        this.props.requestResponses
                                    }
                                    bunqMeTabs={this.props.bunqMeTabs}
                                />
                            )}
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Paper
                            style={{
                                padding: 12
                            }}
                        >
                            <ChartTitle>Category count</ChartTitle>

                            <CategoryCountPieChart
                                height={500}
                                theme={theme}
                                categories={this.props.categories}
                                categoryCountHistory={data.categoryCountHistory}
                            />
                        </Paper>
                    </Grid>
                </Grid>
            </Grid>
        );

        const eventHistoryCharts = (
            <Paper>
                <ChartTitle>
                    {this.state.displayTransactionAmount ? (
                        "Event transaction history"
                    ) : (
                        "Event history count"
                    )}
                </ChartTitle>

                <div>
                    {this.state.splitCardTypes ? this.state
                        .displayTransactionAmount ? (
                        <EventTypeSplitTransactionHistoryChart
                            height={500}
                            theme={theme}
                            labels={data.labels}
                            requestInquiryTransactionHistory={
                                data.requestInquiryTransactionHistory
                            }
                            requestResponseTransactionHistory={
                                data.requestResponseTransactionHistory
                            }
                            bunqMeTabTransactionHistory={
                                data.bunqMeTabTransactionHistory
                            }
                            paymentTransactionHistory={
                                data.paymentTransactionHistory
                            }
                            masterCardPaymentTransactionHistory={
                                data.masterCardPaymentTransactionHistory
                            }
                            maestroPaymentTransactionHistory={
                                data.maestroPaymentTransactionHistory
                            }
                            tapAndPayPaymentTransactionHistory={
                                data.tapAndPayPaymentTransactionHistory
                            }
                            applePayPaymentTransactionHistory={
                                data.applePayPaymentTransactionHistory
                            }
                        />
                    ) : (
                        <EventTypeSplitHistoryChart
                            height={500}
                            theme={theme}
                            labels={data.labels}
                            requestInquiryHistory={data.requestInquiryHistory}
                            requestResponseHistory={data.requestResponseHistory}
                            bunqMeTabHistory={data.bunqMeTabHistory}
                            paymentHistory={data.paymentHistory}
                            masterCardPaymentCountHistory={
                                data.masterCardPaymentCountHistory
                            }
                            maestroPaymentCountHistory={
                                data.maestroPaymentCountHistory
                            }
                            tapAndPayPaymentCountHistory={
                                data.tapAndPayPaymentCountHistory
                            }
                            applePayPaymentCountHistory={
                                data.applePayPaymentCountHistory
                            }
                        />
                    ) : this.state.displayTransactionAmount ? (
                        <EventTypeTransactionHistoryChart
                            height={500}
                            theme={theme}
                            labels={data.labels}
                            requestInquiryTransactionHistory={
                                data.requestInquiryTransactionHistory
                            }
                            requestResponseTransactionHistory={
                                data.requestResponseTransactionHistory
                            }
                            bunqMeTabTransactionHistory={
                                data.bunqMeTabTransactionHistory
                            }
                            paymentTransactionHistory={
                                data.paymentTransactionHistory
                            }
                            masterCardActionTransactionHistory={
                                data.masterCardActionTransactionHistory
                            }
                        />
                    ) : (
                        <EventTypeHistoryChart
                            height={500}
                            theme={theme}
                            labels={data.labels}
                            requestInquiryHistory={data.requestInquiryHistory}
                            requestResponseHistory={data.requestResponseHistory}
                            bunqMeTabHistory={data.bunqMeTabHistory}
                            paymentHistory={data.paymentHistory}
                            masterCardActionHistory={
                                data.masterCardActionHistory
                            }
                        />
                    )}
                </div>
            </Paper>
        );

        return (
            <Grid container spacing={16}>
                <Helmet>
                    <title>{`bunqDesktop - ${t("Stats")}`}</title>
                </Helmet>

                <Grid item xs={12} sm={4} md={3}>
                    <Paper
                        style={{
                            padding: 16,
                            marginBottom: 16
                        }}
                    >
                        <Grid container spacing={16}>
                            <Grid
                                item
                                xs={12}
                                style={{
                                    display: "flex"
                                }}
                            >
                                <RadioGroup
                                    aria-label="timescale"
                                    name="timescale"
                                    value={this.state.timescale}
                                    onChange={this.handleChange}
                                >
                                    <FormControlLabel
                                        value="daily"
                                        control={<Radio />}
                                        label={t("Daily")}
                                    />
                                    <FormControlLabel
                                        value="weekly"
                                        control={<Radio />}
                                        label={t("Weekly")}
                                    />
                                    <FormControlLabel
                                        value="monthly"
                                        control={<Radio />}
                                        label={t("Monthly")}
                                    />
                                    <FormControlLabel
                                        value="yearly"
                                        control={<Radio />}
                                        label={t("Yearly")}
                                    />
                                </RadioGroup>
                            </Grid>

                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={this.state.splitCardTypes}
                                            onChange={event =>
                                                this.setState({
                                                    splitCardTypes:
                                                        event.target.checked
                                                })}
                                        />
                                    }
                                    label="Split card types"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={
                                                this.state
                                                    .displayTransactionAmount
                                            }
                                            onChange={event =>
                                                this.setState({
                                                    displayTransactionAmount:
                                                        event.target.checked
                                                })}
                                        />
                                    }
                                    label="Transaction amount vs. event count"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <LoadOlderButton
                                    wrapperStyle={{ margin: 0 }}
                                    buttonStyle={{ width: "100%" }}
                                    BunqJSClient={this.props.BunqJSClient}
                                    initialBunqConnect={
                                        this.props.initialBunqConnect
                                    }
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <FilterDrawer
                                    bigButton={true}
                                    buttonProps={{
                                        style: {
                                            width: "100%"
                                        },
                                        color: "primary"
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <ClearBtn
                                    bigButton={true}
                                    buttonProps={{
                                        style: {
                                            width: "100%"
                                        },
                                        color: "secondary"
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    <Paper
                        style={{
                            padding: 16
                        }}
                    >
                        <AccountList
                            BunqJSClient={this.props.BunqJSClient}
                            initialBunqConnect={this.props.initialBunqConnect}
                            denseMode={true}
                        />
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={8} md={9}>
                    <Grid container spacing={16}>
                        <Grid item xs={12}>
                            {eventHistoryCharts}
                        </Grid>

                        <Grid item xs={12}>
                            <Paper>
                                <ChartTitle>
                                    {this.state.displayTransactionAmount ? (
                                        "Category transaction history"
                                    ) : (
                                        "Category count history"
                                    )}
                                </ChartTitle>

                                <div>
                                    {this.state.displayTransactionAmount ? (
                                        <CategoryTransactionHistoryChart
                                            height={500}
                                            theme={theme}
                                            labels={data.labels}
                                            transactionType={
                                                this.state
                                                    .categoryTransactionType
                                            }
                                            categories={this.props.categories}
                                            categoryTransactionHistory={
                                                data.categoryTransactionHistory
                                            }
                                        />
                                    ) : (
                                        <CategoryCountHistoryChart
                                            height={500}
                                            theme={theme}
                                            labels={data.labels}
                                            categories={this.props.categories}
                                            categoryCountHistory={
                                                data.categoryCountHistory
                                            }
                                        />
                                    )}
                                </div>
                                {this.state.displayTransactionAmount ? (
                                    <React.Fragment>
                                        <RadioGroup
                                            aria-label="View the total, sent or received amount for each category"
                                            style={{
                                                flexDirection: "row",
                                                justifyContent: "center"
                                            }}
                                            name="categoryTransactionType"
                                            value={
                                                this.state
                                                    .categoryTransactionType
                                            }
                                            onChange={event =>
                                                this.setState({
                                                    categoryTransactionType:
                                                        event.target.value
                                                })}
                                        >
                                            <FormControlLabel
                                                value="total"
                                                control={<Radio />}
                                                label="Total amount"
                                            />
                                            <FormControlLabel
                                                value="sent"
                                                control={<Radio />}
                                                label="Sent"
                                            />
                                            <FormControlLabel
                                                value="received"
                                                control={<Radio />}
                                                label="Received"
                                            />
                                        </RadioGroup>
                                    </React.Fragment>
                                ) : null}
                            </Paper>
                        </Grid>

                        {eventCountStats}
                    </Grid>
                </Grid>
            </Grid>
        );
    }
}

const mapStateToProps = state => {
    return {
        user: state.user.user,
        accounts: state.accounts.accounts,
        selectedAccount: state.accounts.selectedAccount,

        payments: state.payments.payments,
        bunqMeTabs: state.bunq_me_tabs.bunq_me_tabs,
        requestInquiries: state.request_inquiries.request_inquiries,
        requestResponses: state.request_responses.request_responses,
        masterCardActions: state.master_card_actions.master_card_actions,

        paymentsLoading: state.payments.loading,
        bunqMeTabsLoading: state.bunq_me_tabs.loading,
        requestInquiriesLoading: state.request_inquiries.loading,
        requestResponsesLoading: state.request_responses.loading,
        masterCardActionsLoading: state.master_card_actions.loading,

        categories: state.categories.categories,
        categoryConnections: state.categories.category_connections,

        paymentType: state.payment_filter.type,
        paymentVisibility: state.payment_filter.visible,
        bunqMeTabType: state.bunq_me_tab_filter.type,
        bunqMeTabVisibility: state.bunq_me_tab_filter.visible,
        requestType: state.request_filter.type,
        requestVisibility: state.request_filter.visible,
        dateFromFilter: state.date_filter.from_date,
        dateToFilter: state.date_filter.to_date,
        generalFilterDate: state.general_filter.date,
        selectedAccountIds: state.account_id_filter.selected_account_ids,
        toggleAccountIds: state.account_id_filter.toggle
    };
};

const mapDispatchToProps = dispatch => {
    return {};
};

export default connect(mapStateToProps, mapDispatchToProps)(
    withTheme()(translate("translations")(Stats))
);
