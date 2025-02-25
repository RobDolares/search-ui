// Copyright (c) 2021 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project
import '@patternfly/react-core/dist/styles/base.css'
import React, { Fragment, useReducer, useEffect, useState } from 'react'
import { ButtonVariant, ModalVariant } from '@patternfly/react-core'
import {
    AcmModal,
    AcmButton,
    AcmForm,
    AcmTextInput,
    AcmTextArea,
    AcmAlert,
} from '@open-cluster-management/ui-components'
import { useTranslation } from 'react-i18next'
import { SavedSearchesDocument, useSaveSearchMutation, UserSearch } from '../../../../search-sdk/search-sdk'
import { searchClient } from '../../../../search-sdk/search-client'
import SuggestQueryTemplates from '../SuggestedQueryTemplates'
import { makeStyles } from '@material-ui/styles'

type IState = {
    searchName: string
    searchDesc: string
}

type ActionType = {
    field: string
    value: string
}

const initState = {
    searchName: '',
    searchDesc: '',
}

const useStyles = makeStyles({
    prompt: {
        paddingBottom: '1.5rem',
    },
})

export const SaveAndEditSearchModal = (props: any) => {
    const { t } = useTranslation(['search'])
    const [state, dispatch] = useReducer(reducer, initState)
    const { searchName, searchDesc } = state
    const [saveSearchMutation, { error }] = useSaveSearchMutation({ client: searchClient })
    const [isError, setIsError] = useState<boolean>(false)
    const [isNameConflict, setIsNameConflict] = useState<boolean>(false)
    const classes = useStyles()

    useEffect(() => {
        dispatch({ field: 'searchName', value: props.editSearch?.name ?? '' })
        dispatch({ field: 'searchDesc', value: props.editSearch?.description ?? '' })
        return () => {
            setIsNameConflict(false)
        }
    }, [props.editSearch])

    useEffect(() => {
        dispatch({ field: 'searchName', value: '' })
        dispatch({ field: 'searchDesc', value: '' })
        return () => {
            setIsNameConflict(false)
        }
    }, [props.saveSearch])

    function reducer(state: IState, { field, value }: ActionType) {
        return {
            ...state,
            [field]: value,
        }
    }

    function onChange(value: string, e: React.FormEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) {
        const suggestedQueryTemplates = SuggestQueryTemplates?.templates ?? ([] as UserSearch[])
        const allSavedQueryNames = [...suggestedQueryTemplates, ...props.savedSearchQueries].map(
            (savedQuery: UserSearch) => savedQuery.name?.toLowerCase() || ''
        )
        if (
            allSavedQueryNames.includes(value.toLowerCase()) &&
            props.editSearch?.name.toLowerCase() !== value.toLowerCase()
        ) {
            setIsNameConflict(true)
        } else if (isNameConflict) {
            setIsNameConflict(false)
        }
        dispatch({ field: e.currentTarget.name, value: value })
    }

    function SaveSearch() {
        let id = props.editSearch ? props.editSearch.id : Date.now().toString()
        let searchText = props.editSearch ? props.editSearch.searchText : props.saveSearch
        props.editSearch ?? props.setSelectedSearch(searchName)
        saveSearchMutation({
            variables: {
                resource: {
                    id: id,
                    name: searchName,
                    description: searchDesc,
                    searchText: searchText,
                },
            },
            refetchQueries: [{ query: SavedSearchesDocument }],
        }).then((res) => {
            if (res.errors) {
                setIsError(true)
                return null
            }
            props.onClose()
            return null
        })
    }

    const isSubmitDisabled = () => {
        return state.searchName === '' || (!props.editSearch && props.saveSearch === '') || isNameConflict
    }

    return (
        <Fragment>
            <AcmModal
                variant={ModalVariant.small}
                isOpen={props.editSearch !== undefined || props.saveSearch !== undefined}
                title={t('search.modal.save.title')}
                onClose={props.onClose}
                actions={[
                    <AcmButton
                        isDisabled={isSubmitDisabled()}
                        key="confirm"
                        variant={ButtonVariant.primary}
                        onClick={SaveSearch}
                    >
                        {t('search.modal.save.action.save')}
                    </AcmButton>,
                    <AcmButton key="cancel" variant={ButtonVariant.link} onClick={props.onClose}>
                        {t('search.modal.save.action.cancel')}
                    </AcmButton>,
                ]}
            >
                {<p className={classes.prompt}>{t('search.modal.save.text')}</p>}
                {props.saveSearch === '' && !props.editSearch && (
                    <AcmAlert
                        noClose
                        variant={'danger'}
                        isInline={true}
                        title={t('search.modal.save.input.error.title')}
                        subtitle={t('search.modal.save.input.error.desc')}
                    />
                )}
                {isError && <AcmAlert noClose variant={'danger'} title={error!.message} />}
                {isNameConflict && (
                    <AcmAlert
                        isInline
                        noClose
                        variant={'warning'}
                        title={t('search.modal.save.name.conflict.error', { searchName })}
                    />
                )}
                <AcmForm>
                    <AcmTextInput
                        id="add-query-name"
                        name="searchName"
                        label={t('search.modal.save.input.name')}
                        value={searchName}
                        onChange={onChange}
                        maxLength={50}
                        placeholder={t('search.modal.save.input.name.placeholder')}
                        isRequired={true}
                    />
                    <AcmTextArea
                        id="add-query-desc"
                        name="searchDesc"
                        label={t('search.modal.save.input.description')}
                        value={searchDesc}
                        onChange={onChange}
                        required
                        maxLength={120}
                        placeholder={t('search.modal.save.input.description.placeholder')}
                    />
                </AcmForm>
            </AcmModal>
        </Fragment>
    )
}
