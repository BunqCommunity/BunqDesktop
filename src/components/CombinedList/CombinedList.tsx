import BunqJSClient from "@bunq-community/bunq-js-client";
import React from "react";
const sessionStore = require("store/storages/sessionStorage");
import { connect } from "react-redux";
import { translate } from "react-i18next";
import List from "@material-ui/core/List";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import LinearProgress from "@material-ui/core/LinearProgress";
import ListSubheader from "@material-ui/core/ListSubheader";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";

import InfoIcon from "@material-ui/icons/Info";
import { bunqMeTabPut } from "~store/bunqMeTab/thunks";
import { AppDispatch, ReduxState } from "~store/index";

import ClearBtn from "../FilterComponents/ClearFilter";
import FilterDrawer from "../FilterComponents/FilterDrawer";
import ListControls from "./ListControls";
import EventData from "./EventData";

import { nextPage, previousPage, setPage, setPageSize, firstPage } from "~actions/pagination";

import {
    paymentMapper,
    bunqMeTabsMapper,
    masterCardActionMapper,
    requestInquiryBatchMapper,
    requestInquiryMapper,
    requestResponseMapper,
    shareInviteMonetaryAccountInquiryMapper,
    shareInviteMonetaryAccountResponseMapper
} from "./MapperFunctions";
import { humanReadableDate } from "~functions/Utils";
import FilterDisabledChecker from "~functions/FilterDisabledChecker";

import { actions as snackbarActions } from "~store/snackbar";

const styles: any = {
    button: {
        width: "100%"
    },
    pageField: {
        width: 60
    },
    list: {
        textAlign: "left"
    },
    leftPaginationDiv: {
        marginRight: 4
    },
    centerPaginationDiv: {
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
    },
    rightPaginationDiv: {
        marginLeft: 4
    }
};

const STORED_SCROLL_POSITION = "STORED_SCROLL_POSITION";

interface IProps {
  BunqJSClient: BunqJSClient;
}

interface IState {
    displayEventData: boolean,
    totalEvents: number,
    events: Array<any>;
}

class CombinedList extends React.Component<ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & IProps> {
    static defaultProps = {
        hiddenTypes: []
    };

    state: IState;

    constructor(props, context) {
        super(props, context);
        this.state = {
            displayEventData: false,
            totalEvents: 0,
            events: []
        };
    }

    componentDidMount() {
        this.loadEvents();
    }

    componentWillUnmount() {
        // set current scroll position before leaving the page
        sessionStore.write(STORED_SCROLL_POSITION, document.documentElement.scrollTop);
    }

    componentDidUpdate(prevProps) {
        const isLoading =
            this.props.queueLoading ||
            this.props.bunqMeTabsLoading ||
            this.props.paymentsLoading ||
            this.props.requestResponsesLoading ||
            this.props.requestInquiriesLoading ||
            this.props.requestInquiryBatchLoading ||
            this.props.masterCardActionsLoading;
        const wasLoading =
            prevProps.queueLoading ||
            prevProps.bunqMeTabsLoading ||
            prevProps.paymentsLoading ||
            prevProps.requestResponsesLoading ||
            prevProps.requestInquiriesLoading ||
            prevProps.requestInquiryBatchLoading ||
            prevProps.masterCardActionsLoading;

        // no longer loading or filter changed
        if (
            (isLoading == false && wasLoading) ||
            // force update was triggered
            this.props.forceUpdate !== prevProps.forceUpdate ||
            // queue finished loading
            this.props.queueFinishedQueue !== prevProps.queueFinishedQueue ||
            // a filter has changed
            this.props.generalFilterDate !== prevProps.generalFilterDate
        ) {
            this.loadEvents();
        }
    }

    useOldPosition = () => {
        const storedScrollPosition = sessionStore.read(STORED_SCROLL_POSITION);
        if (storedScrollPosition) {
            document.documentElement.scrollTop = storedScrollPosition;
            sessionStore.remove(STORED_SCROLL_POSITION);
        }
    };

    loadEvents = () => {
        const settings = this.getSettings();

        // create arrays of the different endpoint types
        const { bunqMeTabs, hiddenPaymentIds } = bunqMeTabsMapper(settings);
        // load regular payments while hiding the ones connected to the bunq me tabs
        const payments = paymentMapper(settings, hiddenPaymentIds);
        const masterCardActions = masterCardActionMapper(settings);
        const requestResponses = requestResponseMapper(settings, false, true);
        const { requestInquiryBatches, hiddenRequestInquiryIds } = requestInquiryBatchMapper(settings);
        // load request inquiries while hiding requests connected to the request inquiry batches
        const requestInquiries = requestInquiryMapper(settings, hiddenRequestInquiryIds);
        const shareInviteBankInquiries = shareInviteMonetaryAccountInquiryMapper(settings);

        // combine the list, order by date and group by day
        const events = [
            ...bunqMeTabs,
            ...requestResponses,
            ...masterCardActions,
            ...requestInquiries,
            ...requestInquiryBatches,
            ...shareInviteBankInquiries,
            ...payments
        ].sort(function(a, b) {
            return +new Date(b.filterDate) - +new Date(a.filterDate);
        });

        this.setState(
            {
                totalEvents: this.state.totalEvents < events.length ? events.length : this.state.totalEvents,
                events: events
            },
            this.useOldPosition
        );
    };

    copiedValue = type => callback => {
        this.props.openSnackbar(`Copied ${type} to your clipboard`);
    };

    toggleEventData = event => this.setState({ displayEventData: !this.state.displayEventData });

    getSettings = () => {
        return {
            ...this.props,

            displayAcceptedRequests: !!this.props.displayAcceptedRequests,
            displayRequestPayments: !!this.props.displayRequestPayments,

            copiedValue: this.copiedValue
        };
    };

    lastPage = page => () => {
        this.props.setPage(page);
    };
    setPage = pageCount => event => {
        let page = event.target.value - 1;
        pageCount = pageCount - 1;

        if (page < 0) page = 0;
        if (page > pageCount) page = pageCount;

        this.props.setPage(page);
    };
    setPageSize = event => {
        this.props.setPage(0);
        this.props.setPageSize(event.target.value);
    };

    render() {
        const {
            t,
            page,
            pageSize,
            dateFromFilter,
            dateToFilter,
            selectedCategories,
            selectedAccountIds,
            selectedCardIds,
            searchTerm,
            paymentType,
            bunqMeTabType,
            requestType,
            paymentVisibility,
            bunqMeTabVisibility,
            requestVisibility,
            amountFilterAmount
        } = this.props;
        const { events } = this.state;

        // check if a filter is set
        const filterIsDisabled = FilterDisabledChecker({
            dateFromFilter,
            dateToFilter,
            selectedCategories,
            selectedAccountIds,
            selectedCardIds,
            searchTerm,
            paymentType,
            bunqMeTabType,
            requestType,
            paymentVisibility,
            bunqMeTabVisibility,
            requestVisibility,
            amountFilterAmount
        });

        // set a total amount
        const filterEnabledText = filterIsDisabled ? "" : ` of ${this.state.totalEvents}`;

        let loadingContent =
            this.props.queueLoading ||
            this.props.bunqMeTabsLoading ||
            this.props.paymentsLoading ||
            this.props.requestResponsesLoading ||
            this.props.requestInquiriesLoading ||
            this.props.requestInquiryBatchLoading ||
            this.props.shareInviteBankInquiriesLoading ||
            this.props.masterCardActionsLoading ? (
                <LinearProgress />
            ) : (
                <Divider />
            );

        const settings = this.getSettings();
        const requestResponsesPending = requestResponseMapper(settings, true);
        const shareInviteMonetaryAccountResponses = shareInviteMonetaryAccountResponseMapper(settings);

        // directly create a list for the pending requests
        const pendingRequestResponseComponents = requestResponsesPending.map(
            requestResponsesPendingItem => requestResponsesPendingItem.component
        );

        let groupedItems = {};

        // check if all pages is set (pageSize = 0)
        const usedPageSize = pageSize === 0 ? 50 : pageSize;

        // calculate last page
        const unRoundedPageCount = events.length / usedPageSize;
        const pageCount = unRoundedPageCount ? Math.ceil(unRoundedPageCount) : 1;

        // create a smaller list based on the page and pageSize
        const slicedEvents = events.slice(page * usedPageSize, (page + 1) * usedPageSize);

        // group by date
        slicedEvents.map(item => {
            const dateFull = new Date(item.filterDate);
            const date = new Date(dateFull.getFullYear(), dateFull.getMonth(), dateFull.getDate(), 0, 0, 0);
            if (!groupedItems[date.getTime()]) {
                groupedItems[date.getTime()] = {
                    date: dateFull,
                    components: []
                };
            }

            // add item to this date group
            groupedItems[date.getTime()].components.push(item.component);
        });

        // turn the array of arrays back into a single list
        const combinedComponentList = [];
        Object.keys(groupedItems).map(dateLabel => {
            const groupedItem = groupedItems[dateLabel];

            // no unerlying items so we ignore this label
            if (groupedItem.components.length <= 0) {
                return null;
            }

            // get the human readable text for this date group
            const groupTitleText = humanReadableDate(parseFloat(dateLabel), false);

            // add a header component for this date
            combinedComponentList.push([<ListSubheader>{groupTitleText}</ListSubheader>, <Divider />]);

            // add the components to the list
            groupedItem.components.map(component => combinedComponentList.push(component));
        });

        // add the connect requests and pending request responses to the top
        combinedComponentList.unshift(...shareInviteMonetaryAccountResponses);
        combinedComponentList.unshift(...pendingRequestResponseComponents);

        return (
            <List style={styles.left}>
                <ListSubheader>
                    {t("Payments and requests")}: {events.length}
                    {filterEnabledText}
                    <ListItemSecondaryAction>
                        <ClearBtn />
                        <IconButton onClick={this.toggleEventData}>
                            <InfoIcon />
                        </IconButton>
                        <FilterDrawer />
                    </ListItemSecondaryAction>
                </ListSubheader>

                <ListControls
                    page={page}
                    pageCount={pageCount}
                    pageSize={pageSize}
                    lastPage={this.lastPage}
                    setPage={this.setPage}
                    setPageSize={this.setPageSize}
                    nextPage={this.props.nextPage}
                    firstPage={this.props.firstPage}
                    previousPage={this.props.previousPage}
                />

                <EventData t={t} events={events} open={this.state.displayEventData} />

                {loadingContent}
                {combinedComponentList}
            </List>
        );
    }
}

const mapStateToProps = (state: ReduxState) => {
    return {
        user: state.user.user,

        registrationReady: state.registration.ready,

        queueLoading: state.queue.loading,
        queueFinishedQueue: state.queue.finished_queue,

        accounts: state.accounts.accounts,
        accountsAccountId: state.accounts.selectedAccount,

        forceUpdate: state.application.force_update,

        page: state.pagination.page,
        pageSize: state.pagination.page_size,

        searchTerm: state.search_filter.search_term,
        paymentType: state.payment_filter.type,
        paymentVisibility: state.payment_filter.visible,
        bunqMeTabType: state.bunqMeTabFilter.type,
        bunqMeTabVisibility: state.bunqMeTabFilter.visible,
        requestType: state.request_filter.type,
        requestVisibility: state.request_filter.visible,
        dateFromFilter: state.dateFilter.from_date,
        dateToFilter: state.dateFilter.to_date,
        generalFilterDate: state.general_filter.date,

        amountFilterAmount: state.amountFilter.amount,
        amountFilterType: state.amountFilter.type,

        selectedCategories: state.categoryFilter.selected_categories,
        toggleCategoryIds: state.categoryFilter.toggle,
        selectedAccountIds: state.accountIdFilter.selectedAccountIds,
        toggleAccountIds: state.accountIdFilter.toggle,
        selectedCardIds: state.cardIdFilter.selected_card_ids,
        toggleCardIds: state.cardIdFilter.toggle,

        categories: state.categories.categories,
        categoryConnections: state.categories.category_connections,

        payments: state.payments.payments,
        paymentsLoading: state.payments.loading,

        bunqMeTabs: state.bunqMeTabs.bunq_me_tabs,
        bunqMeTabsLoading: state.bunqMeTabs.loading,
        bunqMeTabLoading: state.bunqMeTab.loading,

        masterCardActions: state.master_card_actions.master_card_actions,
        masterCardActionsLoading: state.master_card_actions.loading,

        requestInquiries: state.request_inquiries.request_inquiries,
        requestInquiriesLoading: state.request_inquiries.loading,

        requestInquiryBatches: state.request_inquiry_batches.request_inquiry_batches,
        requestInquiryBatchLoading: state.request_inquiry_batches.loading,

        requestResponses: state.request_responses.request_responses,
        requestResponsesLoading: state.request_responses.loading,

        shareInviteBankInquiries: state.share_invite_monetary_account_inquiries.share_invite_monetary_account_inquiries,
        shareInviteBankInquiriesLoading: state.share_invite_monetary_account_inquiries.loading,

        shareInviteMonetaryAccountResponses:
            state.share_invite_monetary_account_responses.share_invite_monetary_account_responses,
        shareInviteMonetaryAccountResponsesLoading: state.share_invite_monetary_account_responses.loading
    };
};

const mapDispatchToProps = (dispatch: AppDispatch) => {
    return {
        openSnackbar: message => dispatch(snackbarActions.open({ message })),
        bunqMeTabPut: (userId, accountId, tabId, status) =>
            dispatch(bunqMeTabPut(userId, accountId, tabId, status)),
        firstPage: () => dispatch(firstPage()),
        nextPage: () => dispatch(nextPage()),
        previousPage: () => dispatch(previousPage()),
        setPageSize: size => dispatch(setPageSize(size)),
        setPage: page => dispatch(setPage(page))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(translate("translations")(CombinedList));