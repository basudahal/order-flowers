import jenkins.model.*

pipeline {
    agent any
    environment {
        subject = ''
        projectName = 'order-flowers'
        deploymentRole = 'deployment-role'
        deploymentCredentialId = '7583a985-3166-43a1-9340-a2622c4794a9'
        deploymentAccount = '878955458484'
    }
    parameters {
        string(description: 'dev tag', name: 'dev_tag')
        choice(name: 'region', choices: ['us-east-1', 'us-east-2'], description: 'Region to deploy')
        choice(name: 'environment', choices: ['dev'], description: 'Environment to deploy')
    }
    stages {
        stage('Prepare') {
            steps {
                    //buildName "${params.dev_tag}-${params.environment}"
                    //BUILD_DISPLAY_NAME "${params.dev_tag}-${params.environment}-${params.region}"
                    sh "git checkout ${params.dev_tag}"
                    sh "zip -r OrderFlowers_Lambda.zip index.js"
                    sh "zip -r OrderFlowers_Export.zip OrderFlowers_Export.json"
                    //sh "aws iam create-role --role-name lambda-ex --assume-role-policy-document '{"Version": "2012-10-17","Statement": [{ "Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]}'"
                    //sh "aws iam attach-role-policy --role-name lambda-ex --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
                    sh "ls -la"
                    script {
                      lambdaExist = "aws lambda get-function --function-name order-flowers-lambda --region ${params.region}"
                      updateLambda ="aws lambda create-function --function-name order-flowers-lambda --zip-file fileb://./OrderFlowers_Lambda.zip --region ${params.region}"
                      deployLambda = "aws lambda create-function --function-name order-flowers-lambda --zip-file fileb://./OrderFlowers_Lambda.zip --handler index.handler --region ${params.region} --runtime nodejs12.x --role arn:aws:iam::878955458484:role/lambda-ex"
                      deployLex = "aws lex-models start-import --payload fileb://./OrderFlowers_Export.zip --resource-type BOT --merge-strategy OVERWRITE_LATEST --region ${params.region}"
                      deployAccount = deploymentAccount
                    }
            }
        }
        stage('Importing Lex bot') {
          steps {
                script {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: '7583a985-3166-43a1-9340-a2622c4794a9']]) {
                        sh "ls -la"
                        sh deployLex
                        //sh lambdaExist
                    }
                }
          }
        }
        stage('Deploy') {
            steps {
                script {
                    withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: '7583a985-3166-43a1-9340-a2622c4794a9']]) {
                        //sh deployLambda
                        sh updateLambda
                    }
                }
            }
        }
    }
    post {
        always {
            deleteDir()
            cleanWs()
            echo 'Done'
        }
    }
}
